require("dotenv").config({ override: true });
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const HOOPAY_BASE_URL = "https://api.pay.hoopay.com.br";
const paymentStatusByOrder = new Map();

app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
  const blocked = /(?:^|\/)(?:\.env|server\.js|package(?:-lock)?\.json|node_modules|.*\.bak-hoopay)$/i;
  if (blocked.test(req.path)) return res.sendStatus(404);
  next();
});

app.use(express.static(__dirname));

function getHoopayCredentials() {
  const tokenId = String(process.env.HOOPAY_TOKEN_ID || "").trim();
  const secretId = String(process.env.HOOPAY_SECRET_ID || "").trim();

  if (!tokenId || !secretId) {
    const error = new Error("Credenciais da Hoopay não configuradas no servidor.");
    error.statusCode = 500;
    throw error;
  }

  return { tokenId, secretId };
}

function getBasicAuthHeader() {
  const { tokenId, secretId } = getHoopayCredentials();
  return `Basic ${Buffer.from(`${tokenId}:${secretId}`).toString("base64")}`;
}

function normalizeAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    const error = new Error("Valor do produto inválido.");
    error.statusCode = 400;
    throw error;
  }
  return Math.round(amount * 100) / 100;
}

function normalizeText(value, fallback, maxLength = 120) {
  return String(value || fallback).trim().slice(0, maxLength) || fallback;
}

function normalizeCustomer(customer) {
  const document = String(customer.document || "").replace(/\D/g, "").slice(0, 14);
  if (![11, 14].includes(document.length)) {
    const error = new Error("Informe um CPF ou CNPJ válido para gerar o PIX.");
    error.statusCode = 400;
    throw error;
  }

  return {
    email: normalizeText(customer.email, "cliente@sofishub.com.br", 160),
    name: normalizeText(customer.name, "Cliente Sofis Hub", 120),
    phone: String(customer.phone || "11999999999").replace(/\D/g, "").slice(0, 14) || "11999999999",
    document,
  };
}

function getHoopayErrorMessage(responseBody) {
  return responseBody?.errors?.[0]?.message || responseBody?.message || responseBody?.error || "A Hoopay recusou a criação do PIX.";
}

function extractPixData(hoopayResponse) {
  const charge = hoopayResponse?.payment?.charges?.[0] || {};

  return {
    orderUUID: hoopayResponse?.orderUUID || charge.orderUUID || null,
    status: hoopayResponse?.payment?.status || charge.status || "pending",
    pixPayload: charge.pixPayload || hoopayResponse?.pixPayload || "",
    pixQrCode: charge.pixQrCode || hoopayResponse?.pixQrCode || "",
    expireAt: charge.expireAt || hoopayResponse?.expireAt || null,
    raw: hoopayResponse,
  };
}

app.post("/api/pix/charge", async (req, res) => {
  try {
    const product = req.body?.product || {};
    const customer = req.body?.customer || {};
    const amount = normalizeAmount(product.price);
    const title = normalizeText(product.name, "Sofis Hub");
    const callbackURL = process.env.HOOPAY_CALLBACK_URL || `${req.protocol}://${req.get("host")}/api/hoopay/webhook`;

    const payload = {
      amount,
      customer: normalizeCustomer(customer),
      products: [
        {
          title,
          amount,
          quantity: 1,
        },
      ],
      payments: [
        {
          amount,
          type: "pix",
        },
      ],
      data: {
        ip: req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "127.0.0.1",
        callbackURL,
      },
    };

    const hoopayResponse = await fetch(`${HOOPAY_BASE_URL}/charge`, {
      method: "POST",
      headers: {
        "Authorization": getBasicAuthHeader(),
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseText = await hoopayResponse.text();
    let responseBody;
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      responseBody = { message: responseText };
    }

    if (!hoopayResponse.ok) {
      console.error("Hoopay /charge error:", hoopayResponse.status, JSON.stringify(responseBody));
      return res.status(hoopayResponse.status).json({
        error: getHoopayErrorMessage(responseBody),
        details: responseBody,
      });
    }

    const pixData = extractPixData(responseBody);
    if (pixData.orderUUID) {
      paymentStatusByOrder.set(pixData.orderUUID, pixData.status);
    }

    res.json(pixData);
  } catch (error) {
    res.status(error.statusCode || 500).json({
      error: error.message || "Erro ao gerar cobrança PIX.",
    });
  }
});

app.get("/api/pix/status/:orderUUID", async (req, res) => {
  try {
    const orderUUID = req.params.orderUUID;
    const { tokenId } = getHoopayCredentials();

    const hoopayResponse = await fetch(`${HOOPAY_BASE_URL}/pix/consult/${encodeURIComponent(orderUUID)}`, {
      headers: {
        "Authorization": `Bearer ${tokenId}`,
        "Accept": "application/json",
      },
    });

    const responseText = await hoopayResponse.text();
    let responseBody;
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      responseBody = { message: responseText };
    }

    if (!hoopayResponse.ok) {
      return res.json({
        orderUUID,
        status: paymentStatusByOrder.get(orderUUID) || "pending",
        consultAvailable: false,
        details: responseBody,
      });
    }

    const status = responseBody?.payment?.status || responseBody?.status || responseBody?.paymentStatus || paymentStatusByOrder.get(orderUUID) || "pending";
    paymentStatusByOrder.set(orderUUID, status);
    res.json({ orderUUID, status, consultAvailable: true, raw: responseBody });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      error: error.message || "Erro ao consultar pagamento.",
    });
  }
});

app.post("/api/hoopay/webhook", (req, res) => {
  const body = req.body || {};
  const orderUUID = body.orderUUID || body.orderUuid || body.uuid || body.payment?.orderUUID;
  const status = body.status || body.payment?.status || body.paymentStatus;

  if (orderUUID && status) {
    paymentStatusByOrder.set(orderUUID, status);
  }

  res.json({ received: true });
});

app.listen(PORT, () => {
  console.log(`Sofis Hub rodando em http://localhost:${PORT}`);
});
