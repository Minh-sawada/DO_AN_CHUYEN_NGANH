'use client'

import { useEffect, useRef, useState } from 'react'
import * as faceapi from 'face-api.js'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Camera } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface FaceEnrollProps {
  onEnrolled?: () => void
}

export function FaceEnroll({ onEnrolled }: FaceEnrollProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [loadingModels, setLoadingModels] = useState(false)
  const [startingCamera, setStartingCamera] = useState(false)
  const [enrolling, setEnrolling] = useState(false)
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

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  const handleEnroll = async () => {
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
      setEnrolling(true)

      const options = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 })

      let detection = await faceapi
        .detectSingleFace(video, options)
        .withFaceLandmarks()
        .withFaceDescriptor()

      // Fallback: nếu không detectSingleFace được, thử detectAllFaces và lấy khuôn mặt đầu tiên
      if (!detection) {
        const detections = await faceapi
          .detectAllFaces(video, options)
          .withFaceLandmarks()
          .withFaceDescriptors()

        if (!detections || detections.length === 0) {
          toast({
            title: 'Không tìm thấy khuôn mặt',
            description: 'Hãy đưa khuôn mặt của bạn vào giữa khung hình và thử lại.',
            variant: 'destructive',
          })
          return
        }

        detection = detections[0]
      }

      const descriptorArray = Array.from(detection.descriptor)

      // Lấy access_token hiện tại để backend nhận diện được user
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        toast({
          title: 'Chưa đăng nhập',
          description: 'Vui lòng đăng nhập lại trước khi đăng ký khuôn mặt.',
          variant: 'destructive',
        })
        return
      }

      const res = await fetch('/api/auth/face/enroll-descriptor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ descriptor: descriptorArray }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.success) {
        toast({
          title: 'Đăng ký khuôn mặt thất bại',
          description: data?.error || 'Không thể lưu descriptor khuôn mặt.',
          variant: 'destructive',
        })
        return
      }

      toast({
        title: 'Đăng ký khuôn mặt thành công',
        description: 'Bạn có thể sử dụng đăng nhập bằng khuôn mặt ở lần sau.',
      })

      onEnrolled?.()
    } catch (error) {
      console.error('Face enroll error:', error)
      toast({
        title: 'Lỗi',
        description: 'Có lỗi xảy ra khi đăng ký khuôn mặt.',
        variant: 'destructive',
      })
    } finally {
      setEnrolling(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Đăng ký khuôn mặt (FaceAPI)</span>
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
        onClick={handleEnroll}
        disabled={enrolling || loadingModels}
      >
        {enrolling ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Đang đăng ký khuôn mặt...
          </>
        ) : (
          'Đăng ký khuôn mặt'
        )}
      </Button>
    </div>
  )
}
