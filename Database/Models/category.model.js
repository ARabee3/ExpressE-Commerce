import mongoose, { Schema } from "mongoose";
import slugify from "slugify";

const categorySchema = new Schema(
    {
        name: {
            type: String,
            required: [true, "Category name is required"],
            unique: true,
            trim: true,
            minlength: 2,
            maxlength: 50
        },
        slug: {
            type: String,
            lowercase: true
        }
    },
    {timestamps: true}
);

//using slug for URL-friendly version of name
categorySchema.pre("save", function (){
    this.slug = slugify(this.name, { lower: true});
});

export const categoryModel = mongoose.model("Category", categorySchema);
