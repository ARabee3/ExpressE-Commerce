import mongoose from "mongoose"; 
const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, "Review comment is required"],
      trim: true,
      minlength: [5, "Review must be at least 5 characters"],
      maxlength: [500, "Review cannot exceed 500 characters"],
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
  },
  { timestamps: true },
);
reviewSchema.index({ user: 1, product: 1}, { unique: true});

reviewSchema.statics.calcAverageRating = async function (productId) 
{
    const stats = await this.aggregate([
        {$match: { product: productId }},
        {
            $group: {
                _id: "$product",
                avgRating: {$avg: "$rating"},
                ratingsCount: { $sum: 1 }
            }
        }
    ])
    const { productModel } = await import("./product.model.js");
    if (stats.length > 0) {
    await productModel.findByIdAndUpdate(productId, {
      ratingsAverage: stats[0].avgRating,
      ratingsQuantity: stats[0].ratingsCount
    });
  } else {
    await productModel.findByIdAndUpdate(productId, {
      ratingsAverage: 0,
      ratingsQuantity: 0
    });
  }
}
//update rating after creat/update/delete
reviewSchema.post("save", async function () {
  try {
    await this.constructor.calcAverageRating(this.product);
  } catch (err) {
    console.error("Rating calc error:", err);
  }
});

reviewSchema.post("findOneAndUpdate", async function (doc) {
  if (doc) {
    await doc.constructor.calcAverageRating(doc.product);
  }
});

reviewSchema.post("findOneAndDelete", async function (doc) {
  if (doc) {
    await doc.constructor.calcAverageRating(doc.product);
  }
});

export const reviewModel = mongoose.model("Review", reviewSchema);