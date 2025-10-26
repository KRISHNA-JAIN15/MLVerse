const { instance } = require("./server.js");
const crypto = require("crypto");

const processPayment = async (req, res) => {
  const { credits } = req.body;
  if (!credits || credits <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid credits amount",
    });
  }
  // Assume 1 credit = 10 INR
  const amount = credits * 10;
  const options = {
    amount: Number(amount * 100),
    currency: "INR",
  };
  try {
    const response = await instance.orders.create(options);
    res.status(200).json({
      success: true,
      orderId: response.id,
      amount,
      credits,
      response,
    });
  } catch (error) {
    console.error("Error processing payment:", error);
    res.status(500).json({
      success: false,
      message: "Payment processing failed",
    });
  }
};

const getKey = async (req, res) => {
  res.status(200).json({
    key: process.env.RAZORPAY_API_KEY,
  });
};

const paymentVerification = async (req, res, userOps) => {
  console.log("Payment verification data:", req.body);
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    credits,
    userId,
  } = req.body;

  // Check if all required parameters are present
  if (
    !razorpay_order_id ||
    !razorpay_payment_id ||
    !razorpay_signature ||
    !credits ||
    !userId
  ) {
    console.error("Missing required parameters:", {
      razorpay_order_id: !!razorpay_order_id,
      razorpay_payment_id: !!razorpay_payment_id,
      razorpay_signature: !!razorpay_signature,
      credits: !!credits,
      userId: !!userId,
    });
    return res.status(400).json({
      success: false,
      message: "Missing required payment verification parameters",
    });
  }

  const body = razorpay_order_id + "|" + razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_API_SECRET)
    .update(body.toString())
    .digest("hex");

  const isAuthentic = expectedSignature === razorpay_signature;

  if (isAuthentic) {
    try {
      await userOps.updateCredits(userId, credits);
      res.status(200).json({
        success: true,
        message: "Payment verified successfully and credits updated",
        paymentId: razorpay_payment_id,
      });
    } catch (error) {
      console.error("Error updating credits:", error);
      res.status(500).json({
        success: false,
        message: "Payment verified but failed to update credits",
      });
    }
  } else {
    res.status(400).json({
      success: false,
      message: "Payment verification failed",
    });
  }
};

module.exports = { processPayment, getKey, paymentVerification };
