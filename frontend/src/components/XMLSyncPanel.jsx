import React, { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { Upload, Download, RefreshCw, FileUp, FileDown, X } from 'lucide-react'
import { 
    uploadXMLToBackend, 
    downloadXMLFromBackend, 
    syncWithBackend,
    exportStoreToXML,
    sendXMLToBackend
} from '../api/xmlBackendService.js'

export default function XMLSyncPanel() {
    const [isLoading, setIsLoading] = useState(false)
    const [uploadStatus, setUploadStatus] = useState(null)
    const [selectedFiles, setSelectedFiles] = useState({ courses: null, employees: null, groups: null })
    const store = useStore()
    
    const handleFileSelect = (type, file) => {
        setSelectedFiles(prev => ({ ...prev, [type]: file }))
    }
    
    const handleUpload = async (type) => {
        const file = selectedFiles[type]
        if (!file) {
            alert(`Выберите XML файл для ${type}`)
            return
        }
        
        setIsLoading(true)
        setUploadStatus({ type, status: 'loading' })
        
        const result = await uploadXMLToBackend(file, type)
        
        if (result.success) {
            setUploadStatus({ type, status: 'success', message: 'Загружено успешно' })
            setTimeout(() => setUploadStatus(null), 3000)
        } else {
            setUploadStatus({ type, status: 'error', message: result.error })
        }
        
        setIsLoading(false)
    }
    
    const handleDownload = async (type) => {
        setIsLoading(true)
        
        const result = await downloadXMLFromBackend(type)
        
        if (result.success && result.data) {
            // Создаём Blob и скачиваем файл
            const blob = new Blob([result.data], { type: 'application/xml' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${type}.xml`
            a.click()
            URL.revokeObjectURL(url)
        } else {
            alert(`Ошибка загрузки ${type}: ${result.error}`)
        }
        
        setIsLoading(false)
    }
    
    const handleSync = async () => {
        setIsLoading(true)
        
        const result = await syncWithBackend()
        
        if (result.success && result.data) {
            // Импортируем полученные данные в store
            if (result.data.courses?.data) {
                store.importFromXML(result.data.courses.data)
            }
            if (result.data.employees?.data) {
                store.importFromXML(result.data.employees.data)
            }
            if (result.data.groups?.data) {
                store.importFromXML(result.data.groups.data)
            }
            alert('Синхронизация завершена успешно')
            window.location.reload()
        } else {
            alert('Ошибка синхронизации')
        }
        
        setIsLoading(false)
    }
    
    const handleExportToBackend = async () => {
        setIsLoading(true)
        
        const xmlData = exportStoreToXML({
            groups: store.groups,
            courses: store.courses,
            employees: store.employees,
            companies: store.companies
        })
        
        const result = await sendXMLToBackend(xmlData)
        
        if (result.success) {
            alert('Данные успешно отправлены на бэкэнд')
        } else {
            alert(`Ошибка: ${result.error}`)
        }
        
        setIsLoading(false)
    }
    
    return (
        <div className="glass-card" style={{ padding: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <RefreshCw size={18} color="var(--accent-blue)" />
                <span style={{ fontSize: 14, fontWeight: 600 }}>XML Синхронизация с бэкэндом</span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
                {/* Курсы */}
                <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                    <div style={{ fontSize: 12, fontWeight: 500, marginBottom: '8px' }}>📚 Курсы</div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <label style={{
                            padding: '4px 10px',
                            fontSize: 11,
                            background: 'rgba(77, 166, 255, 0.2)',
                            borderRadius: '20px',
                            cursor: 'pointer'
                        }}>
                            <input type="file" accept=".xml" style={{ display: 'none' }} onChange={(e) => handleFileSelect('courses', e.target.files[0])} />
                            Выбрать файл
                        </label>
                        <button onClick={() => handleUpload('courses')} disabled={isLoading} style={{
                            padding: '4px 10px',
                            fontSize: 11,
                            background: 'rgba(77, 166, 255, 0.2)',
                            borderRadius: '20px',
                            cursor: 'pointer',
                            border: 'none'
                        }}>
                            <Upload size={12} /> Загрузить
                        </button>
                        <button onClick={() => handleDownload('courses')} disabled={isLoading} style={{
                            padding: '4px 10px',
                            fontSize: 11,
                            background: 'rgba(77, 166, 255, 0.2)',
                            borderRadius: '20px',
                            cursor: 'pointer',
                            border: 'none'
                        }}>
                            <Download size={12} /> Скачать
                        </button>
                    </div>
                    {selectedFiles.courses && (
                        <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: '4px' }}>
                            {selectedFiles.courses.name}
                        </div>
                    )}
                </div>
                
                {/* Сотрудники */}
                <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                    <div style={{ fontSize: 12, fontWeight: 500, marginBottom: '8px' }}>👥 Сотрудники</div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <label style={{
                            padding: '4px 10px',
                            fontSize: 11,
                            background: 'rgba(77, 166, 255, 0.2)',
                            borderRadius: '20px',
                            cursor: 'pointer'
                        }}>
                            <input type="file" accept=".xml" style={{ display: 'none' }} onChange={(e) => handleFileSelect('employees', e.target.files[0])} />
                            Выбрать файл
                        </label>
                        <button onClick={() => handleUpload('employees')} disabled={isLoading} style={{
                            padding: '4px 10px',
                            fontSize: 11,
                            background: 'rgba(77, 166, 255, 0.2)',
                            borderRadius: '20px',
                            cursor: 'pointer',
                            border: 'none'
                        }}>
                            <Upload size={12} /> Загрузить
                        </button>
                        <button onClick={() => handleDownload('employees')} disabled={isLoading} style={{
                            padding: '4px 10px',
                            fontSize: 11,
                            background: 'rgba(77, 166, 255, 0.2)',
                            borderRadius: '20px',
                            cursor: 'pointer',
                            border: 'none'
                        }}>
                            <Download size={12} /> Скачать
                        </button>
                    </div>
                    {selectedFiles.employees && (
                        <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: '4px' }}>
                            {selectedFiles.employees.name}
                        </div>
                    )}
                </div>
                
                {/* Группы */}
                <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                    <div style={{ fontSize: 12, fontWeight: 500, marginBottom: '8px' }}>📊 Группы (Гант)</div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <label style={{
                            padding: '4px 10px',
                            fontSize: 11,
                            background: 'rgba(77, 166, 255, 0.2)',
                            borderRadius: '20px',
                            cursor: 'pointer'
                        }}>
                            <input type="file" accept=".xml" style={{ display: 'none' }} onChange={(e) => handleFileSelect('groups', e.target.files[0])} />
                            Выбрать файл
                        </label>
                        <button onClick={() => handleUpload('groups')} disabled={isLoading} style={{
                            padding: '4px 10px',
                            fontSize: 11,
                            background: 'rgba(77, 166, 255, 0.2)',
                            borderRadius: '20px',
                            cursor: 'pointer',
                            border: 'none'
                        }}>
                            <Upload size={12} /> Загрузить
                        </button>
                        <button onClick={() => handleDownload('groups')} disabled={isLoading} style={{
                            padding: '4px 10px',
                            fontSize: 11,
                            background: 'rgba(77, 166, 255, 0.2)',
                            borderRadius: '20px',
                            cursor: 'pointer',
                            border: 'none'
                        }}>
                            <Download size={12} /> Скачать
                        </button>
                    </div>
                    {selectedFiles.groups && (
                        <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: '4px' }}>
                            {selectedFiles.groups.name}
                        </div>
                    )}
                </div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <button onClick={handleSync} disabled={isLoading} style={{
                    padding: '8px 20px',
                    fontSize: 13,
                    fontWeight: 500,
                    background: 'rgba(77, 166, 255, 0.2)',
                    color: 'var(--accent-blue)',
                    border: '1px solid rgba(77, 166, 255, 0.3)',
                    borderRadius: '30px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <RefreshCw size={14} /> Синхронизировать всё
                </button>
                
                <button onClick={handleExportToBackend} disabled={isLoading} style={{
                    padding: '8px 20px',
                    fontSize: 13,
                    fontWeight: 500,
                    background: 'rgba(52, 211, 153, 0.2)',
                    color: '#34d399',
                    border: '1px solid rgba(52, 211, 153, 0.3)',
                    borderRadius: '30px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <FileUp size={14} /> Экспорт всех данных на бэкэнд
                </button>
            </div>
            
            {uploadStatus && (
                <div style={{
                    marginTop: '12px',
                    padding: '8px',
                    borderRadius: '8px',
                    fontSize: 11,
                    textAlign: 'center',
                    background: uploadStatus.status === 'success' ? 'rgba(52, 211, 153, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: uploadStatus.status === 'success' ? '#34d399' : '#ef4444'
                }}>
                    {uploadStatus.status === 'success' ? `✅ ${uploadStatus.message}` : `❌ ${uploadStatus.error}`}
                </div>
            )}
        </div>
    )
}