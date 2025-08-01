import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { buffer } from 'micro';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// 禁用默认的body解析器
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只支持POST请求' });
  }

  const buf = await buffer(req);
  const signature = req.headers['stripe-signature']!;

  let event: Stripe.Event;

  try {
    // 验证webhook签名
    event = stripe.webhooks.constructEvent(
      buf,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook签名验证失败:', (err as Error).message);
    return res.status(400).json({ error: 'Webhook签名验证失败' });
  }

  // 处理事件
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('支付成功:', session.id);
        
        // 这里可以添加用户升级逻辑
        // 例如：更新数据库中的用户订阅状态
        // await upgradeUserToPro(session.client_reference_id);
        
        break;
        
      case 'customer.subscription.deleted':
        const subscription = event.data.object as Stripe.Subscription;
        console.log('订阅取消:', subscription.id);
        
        // 这里可以添加用户降级逻辑
        // await downgradeUser(subscription.customer);
        
        break;
        
      default:
        console.log(`未处理的事件类型: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('处理webhook事件时出错:', error);
    res.status(500).json({ error: '处理webhook事件失败' });
  }
}