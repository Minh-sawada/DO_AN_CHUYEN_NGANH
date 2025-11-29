// Test script for file upload functionality
// Run this in browser console when logged into the app

async function testFileUpload() {
  console.log('🧪 Testing file upload functionality...')
  
  // Create a test text file
  const testContent = `Đây là văn bản test để upload lên chatbot.
Nó chứa nội dung về pháp luật Việt Nam để test trích xuất văn bản.
Điều 1: Mọi công dân đều bình đẳng trước pháp luật.
Điều 2: Nhà nước bảo vệ quyền con người, quyền công dân.`
  
  const blob = new Blob([testContent], { type: 'text/plain' })
  const file = new File([blob], 'test-legal-document.txt', { type: 'text/plain' })
  
  const formData = new FormData()
  formData.append('file', file)
  
  try {
    console.log('📤 Uploading test file...')
    const response = await fetch('/api/chat/upload-file', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    })
    
    const result = await response.json()
    
    if (response.ok) {
      console.log('✅ Upload successful!', result)
      console.log('📄 Extracted text:', result.extractedText)
    } else {
      console.error('❌ Upload failed:', result)
    }
  } catch (error) {
    console.error('❌ Upload error:', error)
  }
}

async function testImageUpload() {
  console.log('🧪 Testing image upload functionality...')
  
  // Create a test image (canvas with text)
  const canvas = document.createElement('canvas')
  canvas.width = 400
  canvas.height = 200
  const ctx = canvas.getContext('2d')
  
  if (ctx) {
    // Draw background
    ctx.fillStyle = '#f0f0f0'
    ctx.fillRect(0, 0, 400, 200)
    
    // Draw text
    ctx.fillStyle = '#000000'
    ctx.font = '20px Arial'
    ctx.fillText('Test Legal Document', 50, 50)
    ctx.font = '16px Arial'
    ctx.fillText('Điều 1: Test content', 50, 80)
    ctx.fillText('Điều 2: More test content', 50, 110)
    ctx.fillText('This is a test image for OCR', 50, 140)
  }
  
  // Convert to blob
  canvas.toBlob(async (blob) => {
    if (!blob) {
      console.error('❌ Failed to create image blob')
      return
    }
    
    const file = new File([blob], 'test-legal-image.png', { type: 'image/png' })
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      console.log('📤 Uploading test image...')
      const response = await fetch('/api/chat/upload-file', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      })
      
      const result = await response.json()
      
      if (response.ok) {
        console.log('✅ Image upload successful!', result)
        console.log('📄 Extracted text:', result.extractedText)
      } else {
        console.error('❌ Image upload failed:', result)
      }
    } catch (error) {
      console.error('❌ Image upload error:', error)
    }
  }, 'image/png')
}

// Test functions
window.testFileUpload = testFileUpload
window.testImageUpload = testImageUpload

console.log('🚀 Test functions loaded!')
console.log('Run testFileUpload() to test text file upload')
console.log('Run testImageUpload() to test image upload')
