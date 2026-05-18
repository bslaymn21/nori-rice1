/**
 * Cloudinary Upload Service
 */

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dtxigbfuu/image/upload";
const CLOUDINARY_UPLOAD_PRESET = "nori-rice";

/**
 * Upload an image file to Cloudinary
 */
export async function uploadToCloudinary(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
        const response = await fetch(CLOUDINARY_URL, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error('Upload failed');
        
        const data = await response.json();
        return data.secure_url;
    } catch (error) {
        console.error("Cloudinary Error:", error);
        throw error;
    }
}
