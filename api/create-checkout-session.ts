import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

// 初始化Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只支持POST请求' });
  }

  try {
    const { priceId, userId } = req.body;

    if (!priceId) {
      return res.status(400).json({ error: '缺少价格ID' });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: '服务器配置错误：缺少Stripe密钥' });
    }

    // 创建Stripe Checkout会话
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/`,
      metadata: {
        userId: userId || 'anonymous',
      },
      // 可选：客户信息预填充
      ...(userId && {
        client_reference_id: userId,
      }),
    });

    res.status(200).json({ sessionId: session.id });
  } catch (error) {
    console.error('创建Stripe会话错误:', error);
    res.status(500).json({ 
      error: '创建支付会话失败',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}