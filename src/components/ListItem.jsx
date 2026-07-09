import React, { useEffect, useState } from "react";
import { createItem } from "../api/items";

const CATEGORIES = [
  "Clothing",
  "Books",
  "Electronics",
  "Home & Kitchen",
  "Sports & Outdoors",
  "Toys & Games",
  "Arts & Crafts",
  "Tools",
  "Furniture",
  "Other",
];

const CONDITIONS = [
  { value: "new", label: "New", karma: 100 },
  { value: "like_new", label: "Like New", karma: 75 },
  { value: "good", label: "Good", karma: 50 },
  { value: "fair", label: "Fair", karma: 25 },
];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export default function ListItem({ onBack, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: CATEGORIES[0],
    condition: "good",
    karmaValue: 50,
  });

  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isImageTooLarge, setIsImageTooLarge] = useState(false);

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    if (file && file.size > MAX_FILE_SIZE) {
      setIsImageTooLarge(true);
      setError("Image must be 2MB or smaller");
      setImageFile(null);
      setPreview(null);
      return;
    }
    setIsImageTooLarge(false);
    setError("");
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleConditionChange = (value) => {
    const cond = CONDITIONS.find((c) => c.value === value);
    setFormData({
      ...formData,
      condition: value,
      karmaValue: cond.karma,
    });
  };

  const handleKarmaValueChange = (value) => {
    const numericValue = Number(value);

    setFormData({
      ...formData,
      karmaValue:
        Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : 0,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError("Title is required");
      return;
    }
    if (formData.karmaValue <= 0) {
      setError("Karma value must be greater than 0");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const payload = {
        ...formData,
        title: formData.title.trim(),
        description: formData.description.trim(),
      };
      await createItem(payload, imageFile);

      onSuccess?.();
    } catch (err) {
      // console.error(err);
      // setError(err.response?.data?.message || "Failed to list item");
      console.error("Full error response:", err.response?.data);
      console.error("Status:", err.response?.status);
      console.error("Headers sent:", err.config?.headers);
      setError(err.response?.data?.message || "Failed to list item");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = onBack || onClose;

  return (
    <div className="list-item-page">
      <div className="list-item-page-card">
        <div className="modal-header">
          <h2>List Item</h2>
          {handleBack && (
            <button
              className="btn-secondary"
              type="button"
              onClick={handleBack}
            >
              Back
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="list-item-form">
          <div className="form-group">
            <label>Item Photo</label>
            {preview ? (
              <img src={preview} alt="preview" className="preview-img" />
            ) : (
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
              />
            )}
          </div>

          <div className="form-group">
            <input
              required
              placeholder="Item title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
            />
          </div>

          <div className="form-group">
            <textarea
              placeholder="Description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>

          <div className="form-group">
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
            >
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <select
              value={formData.condition}
              onChange={(e) => handleConditionChange(e.target.value)}
            >
              {CONDITIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="karmaValue">Karma Value</label>
            <input
              id="karmaValue"
              type="number"
              min="1"
              step="1"
              placeholder="Enter your desired karma value"
              value={formData.karmaValue}
              onChange={(e) => handleKarmaValueChange(e.target.value)}
            />
          </div>

          <div className="karma-box">
            Asking Karma: <strong>{formData.karmaValue}</strong>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button
            className="btn-primary"
            type="submit"
            disabled={
              loading ||
              isImageTooLarge ||
              !formData.title.trim() ||
              formData.karmaValue <= 0
            }
          >
            {loading ? "Listing..." : "List Item"}
          </button>
        </form>
      </div>
    </div>
  );
}
