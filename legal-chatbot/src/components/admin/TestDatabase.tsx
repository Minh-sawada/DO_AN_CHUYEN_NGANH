'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Database, CheckCircle, XCircle, Loader2 } from 'lucide-react'

export function TestDatabase() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const { toast } = useToast()

  const handleTest = async () => {
    setLoading(true)
    setResult(null)

    try {
      console.log('Testing database connection...')

      const response = await fetch('/api/test-db', {
        method: 'GET',
      })

      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)

      const data = await response.json()
      console.log('Response data:', data)

      setResult(data)

      if (data.success) {
        toast({
          title: 'Thành công',
          description: 'Kết nối database thành công!',
        })
      } else {
        toast({
          title: 'Lỗi',
          description: data.error || 'Database test failed',
          variant: 'destructive',
        })
      }

    } catch (error) {
      console.error('Test database error:', error)
      setResult({
        success: false,
        error: 'Network error',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
      toast({
        title: 'Lỗi',
        description: 'Không thể kết nối đến server',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Database className="h-5 w-5" />
          <span>Test Database Connection</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          Kiểm tra kết nối database và khả năng insert/select dữ liệu.
        </p>

        <Button onClick={handleTest} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Đang test...
            </>
          ) : (
            <>
              <Database className="mr-2 h-4 w-4" />
              Test Database
            </>
          )}
        </Button>

        {result && (
          <div className={`p-4 rounded-lg border ${
            result.success 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center space-x-2 mb-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <h3 className={`font-semibold ${
                result.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {result.success ? 'Database OK' : 'Database Error'}
              </h3>
            </div>
            
            <pre className="text-sm whitespace-pre-wrap overflow-auto max-h-64">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
