// frontend/src/components/api/xmlService.js

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

/**
 * Отправка XML файла на бэкэнд
 * @param {File} file - XML файл
 * @param {string} type - тип данных ('courses', 'employees', 'groups')
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function uploadXMLToBackend(file, type) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)
    
    try {
        const response = await fetch(`${API_BASE_URL}/xml/upload`, {
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
 * @param {string} type - тип данных ('courses', 'employees', 'groups')
 * @returns {Promise<{success: boolean, data?: string, error?: string}>}
 */
export async function downloadXMLFromBackend(type) {
    try {
        const response = await fetch(`${API_BASE_URL}/xml/export/${type}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/xml'
            }
        })
        if (response.ok) {
            const xmlString = await response.text()
            return { success: true, data: xmlString }
        }
        return { success: false }
    } catch (error) {
        console.error('Ошибка получения XML:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Экранирование спецсимволов для XML
 * @param {string} str - строка для экранирования
 * @returns {string}
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
 * Экспорт всех данных из store в XML и отправка на бэкэнд
 * @param {Object} storeData - данные из store { groups, courses, employees, companies }
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function exportAllToBackend(storeData) {
    const { groups, courses, employees, companies } = storeData
    
    // 1. XML для курсов (формат Edu_Course)
    const coursesXML = `<?xml version="1.0" encoding="UTF-8"?>
<Edu_Courses>
${courses.map(course => `    <Edu_Course>
        <id>${course.id}</id>
        <sCode>${course.id.slice(-4)}</sCode>
        <sCourseHL>${escapeXml(course.name)}</sCourseHL>
        <sDescription>${escapeXml(course.description || '')}</sDescription>
        <nDurationInDays>${course.durationDays}</nDurationInDays>
        <nPricePerPerson>${course.priceHistory?.[course.priceHistory.length - 1]?.price || 0}</nPricePerPerson>
    </Edu_Course>`).join('\n')}
</Edu_Courses>`

    // 2. XML для сотрудников (формат Edu_Participant)
    const employeesXML = `<?xml version="1.0" encoding="UTF-8"?>
<Edu_Participants>
${employees.map(emp => {
    const company = companies.find(c => c.id === emp.companyId)
    const nameParts = emp.fullName.split(' ')
    return `    <Edu_Participant>
        <id>${emp.id}</id>
        <sCode>${emp.id.slice(-4)}</sCode>
        <sLastName>${escapeXml(nameParts[0] || '')}</sLastName>
        <sFirstName>${escapeXml(nameParts[1] || '')}</sFirstName>
        <sMiddleName>${escapeXml(nameParts[2] || '')}</sMiddleName>
        <sFIO>${escapeXml(emp.fullName)}</sFIO>
        <idOrganization>${emp.companyId || ''}</idOrganization>
        <idOrganizationHL>${escapeXml(company?.name || '')}</idOrganizationHL>
        <sEmail>${emp.email || ''}</sEmail>
    </Edu_Participant>`
}).join('\n')}
</Edu_Participants>`

    // 3. XML для групп (формат TrainingGroup для диаграммы Ганта)
    const groupsXML = `<?xml version="1.0" encoding="UTF-8"?>
<TrainingGroups>
${groups.map(group => `    <TrainingGroup id="${group.id}">
        <CourseID>${group.courseId}</CourseID>
        <StartDate>${group.startDate}</StartDate>
        <EndDate>${group.endDate}</EndDate>
        <Status>${group.status}</Status>
        <Participants>${group.participants.map(p => `
            <Participant>
                <EmployeeID>${p.employeeId}</EmployeeID>
                <Progress>${p.progress}</Progress>
            </Participant>`).join('')}
        </Participants>
    </TrainingGroup>`).join('\n')}
</TrainingGroups>`

    // 4. Отправка всех XML на бэкэнд (multipart/form-data)
    const formData = new FormData()
    formData.append('courses', new Blob([coursesXML], { type: 'application/xml' }), 'courses.xml')
    formData.append('employees', new Blob([employeesXML], { type: 'application/xml' }), 'employees.xml')
    formData.append('groups', new Blob([groupsXML], { type: 'application/xml' }), 'groups.xml')
    
    try {
        const response = await fetch(`${API_BASE_URL}/xml/export-all`, {
            method: 'POST',
            body: formData
        })
        
        if (response.ok) {
            return { success: true }
        } else {
            return { success: false, error: `HTTP ${response.status}` }
        }
    } catch (error) {
        console.error('Ошибка экспорта на бэкэнд:', error)
        return { success: false, error: error.message }
    }
}