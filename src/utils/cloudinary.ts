export async function uploadImage(file: File): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', preset)

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: 'POST', body: formData }
  )

  if (!res.ok) throw new Error('Image upload failed')
  const data = await res.json()
  return data.secure_url as string // <- meka thamai DB eke save karanne (image_url)
}