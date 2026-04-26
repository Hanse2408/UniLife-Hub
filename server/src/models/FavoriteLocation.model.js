const mongoose = require("mongoose");

const favoriteLocationSchema = new mongoose.Schema(
    {
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
    },
    { timestamps: true }
);

favoriteLocationSchema.index({ studentId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("FavoriteLocation", favoriteLocationSchema);
