/**
 * XML Backend Service
 * Сервис для обмена XML данными с бэкэндом через multipart/form-data
 * Поддерживает загрузку и выгрузку XML файлов для диаграммы Ганта
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

/**
 * Загрузка XML файла на бэкэнд
 * @param {File} xmlFile - XML файл для загрузки
 * @param {string} type - тип данных ('courses', 'employees', 'groups')
 * @returns {Promise<Object>} результат загрузки
 */
export async function uploadXMLToBackend(xmlFile, type) {
    const formData = new FormData()
    formData.append('file', xmlFile)
    formData.append('type', type)
    formData.append('format', 'xml')
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/xml/upload`, {
            method: 'POST',
            body: formData,
            // Не устанавливаем Content-Type - браузер сам добавит multipart/form-data с границей
        })
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const result = await response.json()
        return { success: true, data: result }
    } catch (error) {
        console.error(`Ошибка загрузки XML (${type}):`, error)
        return { success: false, error: error.message }
    }
}

/**
 * Получение XML данных с бэкэнда
 * @param {string} type - тип данных ('courses', 'employees', 'groups')
 * @returns {Promise<Object>} XML строка и метаданные
 */
export async function downloadXMLFromBackend(type) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/xml/export/${type}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/xml, application/json'
            }
        })
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const contentType = response.headers.get('content-type')
        if (contentType?.includes('application/xml')) {
            const xmlString = await response.text()
            return { success: true, data: xmlString, format: 'xml' }
        } else {
            const json = await response.json()
            return { success: true, data: json, format: 'json' }
        }
    } catch (error) {
        console.error(`Ошибка получения XML (${type}):`, error)
        return { success: false, error: error.message }
    }
}

/**
 * Массовая загрузка нескольких XML файлов
 * @param {Object} files - объект с файлами { courses: File, employees: File, groups: File }
 * @returns {Promise<Object>} результаты загрузки
 */
export async function uploadMultipleXML(files) {
    const formData = new FormData()
    
    if (files.courses) {
        formData.append('courses', files.courses)
    }
    if (files.employees) {
        formData.append('employees', files.employees)
    }
    if (files.groups) {
        formData.append('groups', files.groups)
    }
    formData.append('format', 'xml')
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/xml/upload-multiple`, {
            method: 'POST',
            body: formData
        })
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`)
        }
        
        const result = await response.json()
        return { success: true, data: result }
    } catch (error) {
        console.error('Ошибка массовой загрузки XML:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Синхронизация данных с бэкэндом (получение + обновление)
 * @returns {Promise<Object>} результаты синхронизации
 */
export async function syncWithBackend() {
    const results = {
        courses: null,
        employees: null,
        groups: null
    }
    
    // Получаем данные с бэкэнда
    const types = ['courses', 'employees', 'groups']
    for (const type of types) {
        const result = await downloadXMLFromBackend(type)
        results[type] = result
    }
    
    return {
        success: Object.values(results).every(r => r?.success !== false),
        data: results
    }
}

/**
 * Экспорт текущих данных в XML для отправки на бэкэнд
 * @param {Object} storeData - данные из store (groups, courses, employees)
 * @returns {Object} объект с XML строками
 */
export function exportStoreToXML(storeData) {
    const { groups, courses, employees, companies } = storeData
    
    // Экспорт курсов в формате Edu_Course
    const coursesXML = `<?xml version="1.0" encoding="UTF-8"?>
<Edu_Courses>
    ${courses.map(course => `
    <Edu_Course>
        <id>${course.id}</id>
        <sCode>${course.id.slice(-4)}</sCode>
        <sCourseHL>${escapeXml(course.name)}</sCourseHL>
        <sDescription>${escapeXml(course.description || '')}</sDescription>
        <nDurationInDays>${course.durationDays}</nDurationInDays>
        <nPricePerPerson>${course.priceHistory?.[course.priceHistory.length - 1]?.price || 0}</nPricePerPerson>
    </Edu_Course>`).join('')}
</Edu_Courses>`
    
    // Экспорт сотрудников в формате Edu_Participant
    const employeesXML = `<?xml version="1.0" encoding="UTF-8"?>
<Edu_Participants>
    ${employees.map(emp => {
        const company = companies.find(c => c.id === emp.companyId)
        return `
    <Edu_Participant>
        <id>${emp.id}</id>
        <sCode>${emp.id.slice(-4)}</sCode>
        <sLastName>${escapeXml(emp.fullName.split(' ')[0] || '')}</sLastName>
        <sFirstName>${escapeXml(emp.fullName.split(' ')[1] || '')}</sFirstName>
        <sMiddleName>${escapeXml(emp.fullName.split(' ')[2] || '')}</sMiddleName>
        <sFIO>${escapeXml(emp.fullName)}</sFIO>
        <idOrganization>${emp.companyId || ''}</idOrganization>
        <idOrganizationHL>${escapeXml(company?.name || '')}</idOrganizationHL>
        <sEmail>${emp.email || ''}</sEmail>
    </Edu_Participant>`
    }).join('')}
</Edu_Participants>`
    
    // Экспорт групп в формате TrainingGroup
    const groupsXML = `<?xml version="1.0" encoding="UTF-8"?>
<TrainingGroups>
    ${groups.map(group => `
    <TrainingGroup id="${group.id}">
        <CourseID>${group.courseId}</CourseID>
        <StartDate>${group.startDate}</StartDate>
        <EndDate>${group.endDate}</EndDate>
        <Status>${group.status}</Status>
        <Participants>
            ${group.participants.map(p => `
            <Participant>
                <EmployeeID>${p.employeeId}</EmployeeID>
                <Progress>${p.progress}</Progress>
            </Participant>`).join('')}
        </Participants>
    </TrainingGroup>`).join('')}
</TrainingGroups>`
    
    return { courses: coursesXML, employees: employeesXML, groups: groupsXML }
}

/**
 * Вспомогательная функция для экранирования XML
 */
function escapeXml(str) {
    if (!str) return ''
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
}

/**
 * Отправка XML данных на бэкэнд (как файлы)
 * @param {Object} xmlStrings - объект с XML строками
 * @returns {Promise<Object>} результат отправки
 */
export async function sendXMLToBackend(xmlStrings) {
    const formData = new FormData()
    
    // Создаём Blob из XML строк и добавляем как файлы
    if (xmlStrings.courses) {
        const blob = new Blob([xmlStrings.courses], { type: 'application/xml' })
        formData.append('courses', blob, 'courses.xml')
    }
    if (xmlStrings.employees) {
        const blob = new Blob([xmlStrings.employees], { type: 'application/xml' })
        formData.append('employees', blob, 'employees.xml')
    }
    if (xmlStrings.groups) {
        const blob = new Blob([xmlStrings.groups], { type: 'application/xml' })
        formData.append('groups', blob, 'groups.xml')
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/xml/sync`, {
            method: 'POST',
            body: formData
        })
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`)
        }
        
        const result = await response.json()
        return { success: true, data: result }
    } catch (error) {
        console.error('Ошибка отправки XML на бэкэнд:', error)
        return { success: false, error: error.message }
    }
}