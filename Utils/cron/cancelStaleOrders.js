import cron from "node-cron";
import { orderModel } from "../../Database/Models/order.model.js";
import { productModel } from "../../Database/Models/product.model.js";
import { cartModel } from "../../Database/Models/cart.model.js";
import { couponModel } from "../../Database/Models/coupon.model.js";
import logger from "../logger.js";

/**
 * Cron job: Cancel stale card orders
 * Runs every day at 5:00 AM
 * Cancels all "Pending" orders with paymentMethod "Card"
 * that were created more than 24 hours ago (payment was never completed).
 *
 * For each cancelled order:
 * - Restores product stock
 * - Rolls back coupon usage
 * - Restores the soft-deleted cart
 */

const STALE_THRESHOLD_MINUTES = 20;

async function cancelStaleCardOrders() {
  const cutoffDate = new Date();
  cutoffDate.setMinutes(cutoffDate.getMinutes() - STALE_THRESHOLD_MINUTES);

  try {
    // Find all stale pending card orders
    const staleOrders = await orderModel.find({
      status: "Pending",
      paymentMethod: "Card",
      isPaid: false,
      createdAt: { $lt: cutoffDate },
    });

    if (staleOrders.length === 0) {
      logger.info("[Cron] No stale card orders found to cancel.");
      return;
    }

    logger.info(
      `[Cron] Found ${staleOrders.length} stale card order(s) to cancel.`,
    );

    let cancelledCount = 0;

    for (const order of staleOrders) {
      try {
        // 1. Update order status to Cancelled
        await orderModel.findByIdAndUpdate(order._id, {
          $set: {
            status: "Cancelled",
            cancelledAt: new Date(),
          },
        });

        // 2. Restore stock for each item
        for (const item of order.orderItems) {
          await productModel.findByIdAndUpdate(item.productId, {
            $inc: { stock: item.quantity },
          });
        }

        // 3. Rollback coupon usage
        if (order.couponId) {
          await couponModel.findByIdAndUpdate(order.couponId, {
            $inc: { usedCount: -1 },
          });
        }

        // 4. Restore the soft-deleted cart
        if (order.cartId) {
          await cartModel.findByIdAndUpdate(order.cartId, {
            isDeleted: false,
          });
        }

        cancelledCount++;
        logger.info(
          `[Cron] Cancelled stale order ${order._id} (created: ${order.createdAt.toISOString()})`,
        );
      } catch (err) {
        logger.error(
          { err, orderId: order._id },
          `[Cron] Failed to cancel stale order`,
        );
      }
    }

    logger.info(
      `[Cron] Stale order cleanup complete. Cancelled ${cancelledCount}/${staleOrders.length} orders.`,
    );
  } catch (err) {
    logger.error({ err }, "[Cron] Failed to run stale order cleanup");
  }
}

/**
 * Schedule the cron job — runs every 20 minutes
 * Cron expression: "EVERY-20-MIN * * * *"
 */
export function startCancelStaleOrdersCron() {
  cron.schedule("*/20 * * * *", () => {
    logger.info("[Cron] Running stale card orders cleanup (every 20 min)...");
    cancelStaleCardOrders();
  });

  logger.info("[Cron] Stale card orders cleanup scheduled — every 20 minutes");
}
