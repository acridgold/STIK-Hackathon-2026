
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

/**
 * Отправка XML файла на бэкэнд
 */
export async function uploadXMLToBackend(file, type) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/xml/upload`, {
            method: 'POST',
            body: formData,
        })
        return { success: response.ok }
    } catch (error) {
        console.error('Ошибка отправки XML:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Получение XML с бэкэнда
 */
export async function downloadXMLFromBackend(type) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/xml/export/${type}`)
        if (response.ok) {
            const xmlString = await response.text()
            return { success: true, data: xmlString }
        }
        return { success: false }
    } catch (error) {
        return { success: false, error: error.message }
    }
}