'use client'

import { useEffect, useRef, useState } from 'react'
import * as faceapi from 'face-api.js'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { Loader2, Camera } from 'lucide-react'

interface FaceLoginProps {
  onRecognizedEmail?: (email: string) => void
}

export function FaceLogin({ onRecognizedEmail }: FaceLoginProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [loadingModels, setLoadingModels] = useState(false)
  const [startingCamera, setStartingCamera] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const loadModels = async () => {
      try {
        setLoadingModels(true)
        const MODEL_URL = '/models'
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ])
        setModelsLoaded(true)
      } catch (error) {
        console.error('Error loading face-api models:', error)
        toast({
          title: 'Lỗi tải model',
          description: 'Không thể tải model nhận diện khuôn mặt. Kiểm tra thư mục /models.',
          variant: 'destructive',
        })
      } finally {
        setLoadingModels(false)
      }
    }

    loadModels()
  }, [toast])

  const startCamera = async () => {
    try {
      setStartingCamera(true)
      if (!navigator.mediaDevices?.getUserMedia) {
        toast({
          title: 'Không hỗ trợ camera',
          description: 'Trình duyệt không hỗ trợ truy cập camera.',
          variant: 'destructive',
        })
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
    } catch (error) {
      console.error('Error starting camera:', error)
      toast({
        title: 'Lỗi camera',
        description: 'Không thể bật camera. Vui lòng kiểm tra quyền truy cập.',
        variant: 'destructive',
      })
    } finally {
      setStartingCamera(false)
    }
  }

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream | null
    if (stream) {
      stream.getTracks().forEach((t) => t.stop())
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const handleDetectAndLogin = async () => {
    if (!modelsLoaded) {
      toast({
        title: 'Model chưa sẵn sàng',
        description: 'Vui lòng đợi model tải xong.',
        variant: 'destructive',
      })
      return
    }

    const video = videoRef.current
    if (!video) {
      toast({
        title: 'Không tìm thấy video',
        description: 'Camera chưa được bật.',
        variant: 'destructive',
      })
      return
    }

    try {
      setDetecting(true)

      const options = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 })

      let detection = await faceapi
        .detectSingleFace(video, options)
        .withFaceLandmarks()
        .withFaceDescriptor()

      if (!detection) {
        const detections = await faceapi
          .detectAllFaces(video, options)
          .withFaceLandmarks()
          .withFaceDescriptors()

        if (!detections || detections.length === 0) {
          toast({
            title: 'Không tìm thấy khuôn mặt',
            description: 'Hãy đưa khuôn mặt của bạn vào giữa vòng tròn và thử lại.',
            variant: 'destructive',
          })
          return
        }

        detection = detections[0]
      }

      const descriptorArray = Array.from(detection.descriptor)

      const res = await fetch('/api/auth/face/descriptors')
      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.success || !Array.isArray(data.profiles) || data.profiles.length === 0) {
        toast({
          title: 'Không có dữ liệu khuôn mặt',
          description: 'Chưa có người dùng nào đăng ký khuôn mặt.',
          variant: 'destructive',
        })
        return
      }

      let bestMatchUserId: string | null = null
      let bestDistance = Number.MAX_VALUE

      for (const p of data.profiles) {
        if (!Array.isArray(p.descriptor)) continue
        const distance = faceapi.euclideanDistance(descriptorArray, p.descriptor)
        if (distance < bestDistance) {
          bestDistance = distance
          bestMatchUserId = p.user_id
        }
      }

      const THRESHOLD = 0.6

      if (!bestMatchUserId || bestDistance > THRESHOLD) {
        toast({
          title: 'Không khớp khuôn mặt',
          description: 'Không tìm thấy tài khoản trùng khớp đủ độ tin cậy.',
          variant: 'destructive',
        })
        return
      }

      // Gọi API để lấy email tương ứng userId đã nhận diện
      let recognizedEmail: string | null = null
      try {
        const emailRes = await fetch('/api/auth/face/user-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: bestMatchUserId }),
        })
        const emailData = await emailRes.json().catch(() => null)
        if (emailRes.ok && emailData?.success && emailData?.email) {
          recognizedEmail = emailData.email
        }
      } catch (e) {
        console.warn('FaceLogin: cannot fetch email for recognized user', e)
      }

      if (recognizedEmail && onRecognizedEmail) {
        onRecognizedEmail(recognizedEmail)
        toast({
          title: 'Đã nhận diện khuôn mặt',
          description: 'Đã điền sẵn email, vui lòng nhập mật khẩu để đăng nhập.',
        })
      } else {
        toast({
          title: 'Đã nhận diện khuôn mặt',
          description: 'Vui lòng nhập email và mật khẩu để hoàn tất đăng nhập.',
        })
      }
    } catch (error) {
      console.error('Face detect/login error:', error)
      toast({
        title: 'Lỗi',
        description: 'Có lỗi xảy ra khi nhận diện khuôn mặt.',
        variant: 'destructive',
      })
    } finally {
      setDetecting(false)
    }
  }

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Đăng nhập bằng khuôn mặt (FaceAPI)</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={startCamera}
          disabled={loadingModels || startingCamera}
        >
          {startingCamera ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Đang bật camera...
            </>
          ) : (
            <>
              <Camera className="mr-2 h-4 w-4" />
              Bật camera
            </>
          )}
        </Button>
      </div>

      <div className="relative w-full rounded-lg border border-gray-200 overflow-hidden bg-black/80 h-56 flex items-center justify-center">
        <video ref={videoRef} className="w-full h-full object-cover -scale-x-100" muted playsInline />

        {/* Vòng tròn canh khuôn mặt */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="w-40 h-40 rounded-full border-2 border-white/80 bg-black/10" />
        </div>

        {!modelsLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white text-sm">
            {loadingModels ? 'Đang tải model nhận diện...' : 'Model chưa sẵn sàng'}
          </div>
        )}
      </div>

      <Button
        type="button"
        className="w-full h-10"
        onClick={handleDetectAndLogin}
        disabled={detecting || loadingModels}
      >
        {detecting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Đang nhận diện và đăng nhập...
          </>
        ) : (
          'Nhận diện và đăng nhập'
        )}
      </Button>
    </div>
  )
}
