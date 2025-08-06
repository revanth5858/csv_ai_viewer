// Global variables
let originalData = [];
let currentData = [];
let filteredData = [];
let currentPage = 0;
let rowsPerPage = 50;
let sortColumn = null;
let sortAscending = true;
let activeFilters = {};
let calculatedFields = {};
let drillDownHistory = [];
let currentDrillLevel = 'main';
let chartSettings = {
    showGrid: true,
    showLabels: true,
    rotateLabels: false,
    enableTooltips: true,
    enableAnimations: true,
    enableDrilldown: false,
    theme: 'default',
    colorPalette: 'default'
};
let undoStack = [];
let redoStack = [];
let selectedCells = new Set();
let selectionStart = null;
let isResizing = false;
let currentResizeColumn = null;
let isDragging = false;
let draggedColumn = null;
let isHeaderFrozen = false;
let conditionalFormattingRules = [];
let findReplaceHistory = [];
let formulaCells = new Map();
let dataValidationRules = new Map();
let autoSaveInterval = null;
let lastSavedData = null;
let isDarkMode = localStorage.getItem('darkMode') === 'true';
// AI Mode Management
let currentAIMode = 'query';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('Application initializing...');
    
    try {
    setupFileUpload();
    setupDragAndDrop();
    
    // Test backend connection
    testBackendConnection().then(isConnected => {
        if (isConnected) {
            console.log('Backend is ready');
        } else {
            console.warn('Backend connection failed - some features may not work');
        }
        }).catch(error => {
            console.error('Backend connection test failed:', error);
    });
        
        // Initialize chart functionality
        initializeChartSystem();
    
    console.log('Application initialization completed');
    } catch (error) {
        console.error('Error during application initialization:', error);
        alert('Application initialization failed. Please refresh the page.');
    }
});

// Initialize chart system
function initializeChartSystem() {
    console.log('Initializing chart system...');
    
    try {
        // Add event listeners for chart controls
        const chartTypeSelect = document.getElementById('chartType');
        const xAxisSelect = document.getElementById('xAxis');
        const yAxisSelect = document.getElementById('yAxis');
        
        console.log('Chart elements found:', {
            chartTypeSelect: !!chartTypeSelect,
            xAxisSelect: !!xAxisSelect,
            yAxisSelect: !!yAxisSelect
        });
        
        if (chartTypeSelect) {
            chartTypeSelect.addEventListener('change', function() {
                console.log('Chart type changed to:', this.value);
                try {
                    updateChart();
                } catch (error) {
                    console.error('Error in chart type change handler:', error);
                }
            });
        } else {
            console.warn('Chart type select not found');
        }
        
        if (xAxisSelect) {
            xAxisSelect.addEventListener('change', function() {
                console.log('X-axis changed to:', this.value);
                try {
                    updateChart();
                } catch (error) {
                    console.error('Error in X-axis change handler:', error);
                }
            });
        } else {
            console.warn('X-axis select not found');
        }
        
        if (yAxisSelect) {
            yAxisSelect.addEventListener('change', function() {
                console.log('Y-axis changed to:', this.value);
                try {
                    updateChart();
                } catch (error) {
                    console.error('Error in Y-axis change handler:', error);
                }
            });
        } else {
            console.warn('Y-axis select not found');
        }
        
        console.log('Chart system initialized successfully');
    } catch (error) {
        console.error('Error initializing chart system:', error);
    }
}

// File upload setup
function setupFileUpload() {
    const fileInput = document.getElementById('fileInput');
    fileInput.addEventListener('change', handleFileSelect);
}

// Drag and drop setup
function setupDragAndDrop() {
    const uploadCard = document.querySelector('.upload-card');
    
    uploadCard.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadCard.style.borderColor = '#667eea';
        uploadCard.style.background = '#f0f4ff';
    });
    
    uploadCard.addEventListener('dragleave', function(e) {
        e.preventDefault();
        uploadCard.style.borderColor = '#ddd';
        uploadCard.style.background = '#fafafa';
    });
    
    uploadCard.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadCard.style.borderColor = '#ddd';
        uploadCard.style.background = '#fafafa';
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });
}

// Handle file selection
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        handleFile(file);
    }
}

// Handle file processing
function handleFile(file) {
    console.log('Handling file:', file.name);
    console.log('File size:', file.size);
    
    if (!file.name.toLowerCase().endsWith('.csv')) {
        alert('Please select a CSV file.');
        return;
    }
    
    if (file.size === 0) {
        alert('The selected file is empty.');
        return;
    }
    
    if (file.size > 50 * 1024 * 1024) { // 50MB limit
        alert('File size is too large. Please select a file smaller than 50MB.');
        return;
    }
    
    showLoading();
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            console.log('File read successfully');
            const csv = e.target.result;
            console.log('CSV content length:', csv.length);
            
            if (!csv || csv.trim() === '') {
                alert('The CSV file appears to be empty.');
                hideLoading();
                return;
            }
            
            const data = parseCSV(csv);
            console.log('Parsed data length:', data.length);
            
            if (data.length === 0) {
                alert('The CSV file appears to be empty or could not be parsed. Please check the file format.');
                hideLoading();
                return;
            }
            
            // Validate that we have headers and data
            const firstRow = data[0];
            if (!firstRow || Object.keys(firstRow).length === 0) {
                alert('The CSV file does not contain valid headers or data.');
                hideLoading();
                return;
            }
            
            originalData = data;
            currentData = [...data];
            filteredData = [...data];
            
            console.log('Data assigned to global variables');
            console.log('originalData length:', originalData.length);
            console.log('currentData length:', currentData.length);
            console.log('filteredData length:', filteredData.length);
            console.log('Sample data structure:', Object.keys(firstRow));
            
            displayFileInfo(file, data);
            populateTable();
            populateSortOptions();
            showTableSection();
            hideLoading();
            
            console.log('File processing completed successfully');
            
        } catch (error) {
            console.error('Error parsing CSV:', error);
            alert(`Error parsing CSV file: ${error.message}. Please check the file format and try again.`);
            hideLoading();
        }
    };
    
    reader.onerror = function() {
        console.error('Error reading file');
        alert('Error reading the file. Please try again.');
        hideLoading();
    };
    
    reader.readAsText(file);
}

// Parse CSV data with improved error handling
function parseCSV(csv) {
    console.log('Parsing CSV data...');
    console.log('CSV length:', csv.length);
    
    try {
        // Handle different line endings
        const normalizedCsv = csv.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        const lines = normalizedCsv.split('\n');
        console.log('Number of lines:', lines.length);
        
        if (lines.length === 0) {
            console.error('No lines found in CSV');
            return [];
        }
        
        // Find the first non-empty line for headers
        let headerLineIndex = 0;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim() !== '') {
                headerLineIndex = i;
                break;
            }
        }
        
        if (headerLineIndex >= lines.length) {
            console.error('No non-empty lines found in CSV');
            return [];
        }
        
        // Parse headers with proper CSV handling
        const headerLine = lines[headerLineIndex];
        const headers = parseCSVLine(headerLine);
        console.log('Headers found:', headers);
        console.log('Number of headers:', headers.length);
        
        if (headers.length === 0) {
            console.error('No headers found in CSV');
            return [];
        }
        
        const data = [];
        
        // Process data rows
        for (let i = headerLineIndex + 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line === '') continue;
            
            try {
                const values = parseCSVLine(line);
                const row = {};
                
                headers.forEach((header, index) => {
                    row[header] = values[index] || '';
                });
                
                data.push(row);
            } catch (error) {
                console.warn(`Error parsing line ${i + 1}:`, error);
                // Continue processing other lines
            }
        }
        
        console.log('Parsed data rows:', data.length);
        if (data.length > 0) {
            console.log('Sample row:', data[0]);
            console.log('Sample row keys:', Object.keys(data[0]));
        }
        
        return data;
        
    } catch (error) {
        console.error('Error parsing CSV:', error);
        throw new Error(`Failed to parse CSV: ${error.message}`);
    }
}

// Helper function to parse a single CSV line with proper quote handling
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < line.length) {
        const char = line[i];
        
        if (char === '"') {
            if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
                // Escaped quote
                current += '"';
                i += 2;
            } else {
                // Toggle quote state
                inQuotes = !inQuotes;
                i++;
            }
        } else if (char === ',' && !inQuotes) {
            // End of field
            result.push(current.trim());
            current = '';
            i++;
        } else {
            current += char;
            i++;
        }
    }
    
    // Add the last field
    result.push(current.trim());
    
    return result;
}

// Display file information
function displayFileInfo(file, data) {
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileSize').textContent = formatFileSize(file.size);
    document.getElementById('rowCount').textContent = data.length;
    document.getElementById('columnCount').textContent = Object.keys(data[0] || {}).length;
    document.getElementById('fileInfo').style.display = 'block';
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Populate table
function populateTable() {
    const headers = Object.keys(currentData[0] || {});
    const tableHeader = document.getElementById('tableHeader');
    const tableBody = document.getElementById('tableBody');
    
    // Clear existing content
    tableHeader.innerHTML = '';
    tableBody.innerHTML = '';
    
    // Create header row
    const headerRow = document.createElement('tr');
    headers.forEach((header, index) => {
        const th = document.createElement('th');
        th.className = 'sortable draggable';
        th.draggable = true;
        th.dataset.columnIndex = index;
        th.dataset.columnName = header;
        
        // Add drag event handlers
        th.addEventListener('dragstart', handleHeaderDragStart);
        th.addEventListener('dragover', handleHeaderDragOver);
        th.addEventListener('drop', handleHeaderDrop);
        th.addEventListener('dragenter', handleHeaderDragEnter);
        th.addEventListener('dragleave', handleHeaderDragLeave);
        
        // Create header content container
        const headerContent = document.createElement('div');
        headerContent.className = 'header-content';
        
        // Header text
        const headerText = document.createElement('span');
        headerText.textContent = header;
        headerText.className = 'header-text';
        headerContent.appendChild(headerText);
        
        // Single header action button
        const headerActionBtn = document.createElement('button');
        headerActionBtn.className = 'header-action-btn';
        headerActionBtn.innerHTML = '<i class="fas fa-ellipsis-v"></i>';
        headerActionBtn.title = 'Column options (Sort, Filter, Menu)';
        headerActionBtn.onclick = (e) => {
            e.stopPropagation();
            showHeaderActionMenu(header, e);
        };
        
        headerContent.appendChild(headerActionBtn);
        th.appendChild(headerContent);
        
        // Add click handler for sorting
        th.onclick = () => sortByColumn(header);
        
        headerRow.appendChild(th);
    });
    tableHeader.appendChild(headerRow);
    
    // Populate data
    updateTableData();
    
    // After creating headers, make them resizable
    setTimeout(() => {
        makeHeadersResizable();
    }, 100);
    
    // Apply conditional formatting after table is populated
    setTimeout(() => {
        applyConditionalFormatting();
    }, 200);
}

// Update table data based on current page and filters
function updateTableData() {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '';
    
    const startIndex = currentPage * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    console.log('updateTableData - filteredData for table:', filteredData);
    console.log('updateTableData - filteredData length:', filteredData.length);
    const pageData = filteredData.slice(startIndex, endIndex);
    console.log('updateTableData - pageData for table:', pageData);
    console.log('updateTableData - pageData length:', pageData.length);
    
    pageData.forEach((row, index) => {
        const tr = document.createElement('tr');
        Object.values(row).forEach((value, colIdx) => {
            const td = document.createElement('td');
            td.id = cellId(startIndex + index, colIdx);
            td.textContent = value;
            tr.appendChild(td);
        });
        tableBody.appendChild(tr);
    });
    highlightSelectedCells();
    
    updatePaginationInfo();
    updateTableInfo();
}

// Update cell value
function updateCellValue(rowIndex, input) {
    // Save current state for undo
    undoStack.push(JSON.parse(JSON.stringify(currentData)));
    redoStack = [];
    
    const headers = Object.keys(currentData[0]);
    const colIndex = Array.from(input.parentNode.parentNode.children).indexOf(input.parentNode);
    const header = headers[colIndex];
    const newValue = input.value;
    
    // Check if it's a formula
    if (newValue.startsWith('=')) {
        const formula = newValue.substring(1);
        const result = evaluateFormula(formula, rowIndex, colIndex);
        currentData[rowIndex][header] = result;
        filteredData[rowIndex][header] = result;
        formulaCells.set(`${rowIndex}-${colIndex}`, formula);
        input.value = result;
    } else {
        currentData[rowIndex][header] = newValue;
        filteredData[rowIndex][header] = newValue;
        formulaCells.delete(`${rowIndex}-${colIndex}`);
    }
    
    // Apply data validation
    applyDataValidation(rowIndex, colIndex, newValue);
    
    // Recalculate dependent formulas
    recalculateFormulas();
    
    // Trigger autosave after cell update
    setTimeout(autoSave, 1000);
}

function evaluateFormula(formula, rowIndex, colIndex) {
    try {
        // Handle basic functions
        if (formula.startsWith('SUM(')) {
            return evaluateSum(formula, rowIndex);
        } else if (formula.startsWith('AVG(')) {
            return evaluateAvg(formula, rowIndex);
        } else if (formula.startsWith('COUNT(')) {
            return evaluateCount(formula, rowIndex);
        } else if (formula.startsWith('MAX(')) {
            return evaluateMax(formula, rowIndex);
        } else if (formula.startsWith('MIN(')) {
            return evaluateMin(formula, rowIndex);
        }
        
        // Handle cell references (A1, B2, etc.)
        const cellRefRegex = /[A-Z]+\d+/g;
        let processedFormula = formula;
        const matches = formula.match(cellRefRegex);
        
        if (matches) {
            matches.forEach(match => {
                const cellValue = getCellValueByReference(match);
                processedFormula = processedFormula.replace(match, cellValue || '0');
            });
        }
        
        // Evaluate the processed formula
        return eval(processedFormula);
    } catch (error) {
        console.error('Formula error:', error);
        return '#ERROR';
    }
}

function getCellValueByReference(ref) {
    const col = ref.match(/[A-Z]+/)[0];
    const row = parseInt(ref.match(/\d+/)[0]) - 1;
    
    const headers = Object.keys(currentData[0]);
    const colIndex = columnToIndex(col);
    
    if (currentData[row] && headers[colIndex]) {
        return parseFloat(currentData[row][headers[colIndex]]) || 0;
    }
    return 0;
}

function columnToIndex(col) {
    let index = 0;
    for (let i = 0; i < col.length; i++) {
        index = index * 26 + (col.charCodeAt(i) - 64);
    }
    return index - 1;
}

function evaluateSum(formula, rowIndex) {
    const range = extractRange(formula);
    if (!range) return 0;
    
    let sum = 0;
    for (let r = range.startRow; r <= range.endRow; r++) {
        for (let c = range.startCol; c <= range.endCol; c++) {
            const value = getCellValueByIndex(r, c);
            sum += parseFloat(value) || 0;
        }
    }
    return sum;
}

function evaluateAvg(formula, rowIndex) {
    const range = extractRange(formula);
    if (!range) return 0;
    
    let sum = 0;
    let count = 0;
    for (let r = range.startRow; r <= range.endRow; r++) {
        for (let c = range.startCol; c <= range.endCol; c++) {
            const value = getCellValueByIndex(r, c);
            if (!isNaN(parseFloat(value))) {
                sum += parseFloat(value);
                count++;
            }
        }
    }
    return count > 0 ? sum / count : 0;
}

function evaluateCount(formula, rowIndex) {
    const range = extractRange(formula);
    if (!range) return 0;
    
    let count = 0;
    for (let r = range.startRow; r <= range.endRow; r++) {
        for (let c = range.startCol; c <= range.endCol; c++) {
            const value = getCellValueByIndex(r, c);
            if (value !== '' && value !== null && value !== undefined) {
                count++;
            }
        }
    }
    return count;
}

function evaluateMax(formula, rowIndex) {
    const range = extractRange(formula);
    if (!range) return 0;
    
    let max = -Infinity;
    for (let r = range.startRow; r <= range.endRow; r++) {
        for (let c = range.startCol; c <= range.endCol; c++) {
            const value = parseFloat(getCellValueByIndex(r, c));
            if (!isNaN(value) && value > max) {
                max = value;
            }
        }
    }
    return max === -Infinity ? 0 : max;
}

function evaluateMin(formula, rowIndex) {
    const range = extractRange(formula);
    if (!range) return 0;
    
    let min = Infinity;
    for (let r = range.startRow; r <= range.endRow; r++) {
        for (let c = range.startCol; c <= range.endCol; c++) {
            const value = parseFloat(getCellValueByIndex(r, c));
            if (!isNaN(value) && value < min) {
                min = value;
            }
        }
    }
    return min === Infinity ? 0 : min;
}

function extractRange(formula) {
    const match = formula.match(/\(([A-Z]+\d+):([A-Z]+\d+)\)/);
    if (!match) return null;
    
    const startRef = match[1];
    const endRef = match[2];
    
    const startCol = columnToIndex(startRef.match(/[A-Z]+/)[0]);
    const startRow = parseInt(startRef.match(/\d+/)[0]) - 1;
    const endCol = columnToIndex(endRef.match(/[A-Z]+/)[0]);
    const endRow = parseInt(endRef.match(/\d+/)[0]) - 1;
    
    return { startRow, startCol, endRow, endCol };
}

function getCellValueByIndex(row, col) {
    const headers = Object.keys(currentData[0]);
    if (currentData[row] && headers[col]) {
        return currentData[row][headers[col]];
    }
    return '';
}

function recalculateFormulas() {
    formulaCells.forEach((formula, cellKey) => {
        const [rowIndex, colIndex] = cellKey.split('-').map(Number);
        const headers = Object.keys(currentData[0]);
        const header = headers[colIndex];
        const result = evaluateFormula(formula, rowIndex, colIndex);
        currentData[rowIndex][header] = result;
        filteredData[rowIndex][header] = result;
    });
    populateTable();
}

function showDataValidation() {
    if (currentData.length === 0) {
        alert('Please load data first.');
        return;
    }
    
    showModal('dataValidationModal');
    
    // Populate column dropdown
    const validationColumn = document.getElementById('validationColumn');
    if (validationColumn) {
        validationColumn.innerHTML = '<option value="">Select Column</option>';
        Object.keys(currentData[0]).forEach(column => {
            validationColumn.innerHTML += `<option value="${column}">${column}</option>`;
        });
    }
}

function addDataValidation() {
    const column = document.getElementById('validationColumn').value;
    const type = document.getElementById('validationType').value;
    const options = document.getElementById('validationOptionsText').value;
    
    dataValidationRules.set(column, { type, options });
    alert('Data validation rule added');
}

function applyDataValidation(rowIndex, colIndex, value) {
    const headers = Object.keys(currentData[0]);
    const header = headers[colIndex];
    const rule = dataValidationRules.get(header);
    
    if (!rule) return;
    
    let isValid = true;
    let errorMessage = '';
    
    switch (rule.type) {
        case 'number':
            isValid = !isNaN(parseFloat(value)) && isFinite(value);
            errorMessage = 'Please enter a valid number';
            break;
        case 'email':
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            isValid = emailRegex.test(value);
            errorMessage = 'Please enter a valid email address';
            break;
        case 'date':
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            isValid = dateRegex.test(value);
            errorMessage = 'Please enter a valid date (YYYY-MM-DD)';
            break;
        case 'dropdown':
            const options = rule.options.split(',').map(opt => opt.trim());
            isValid = options.includes(value);
            errorMessage = `Please select from: ${options.join(', ')}`;
            break;
    }
    
    if (!isValid && value !== '') {
        alert(`Validation Error: ${errorMessage}`);
        // Revert the value
        currentData[rowIndex][header] = '';
        filteredData[rowIndex][header] = '';
        populateTable();
    }
}

function clearDataValidation() {
    dataValidationRules.clear();
    alert('All data validation rules cleared');
}

// Sort by column
function sortByColumn(column) {
    if (sortColumn === column) {
        sortAscending = !sortAscending;
    } else {
        sortColumn = column;
        sortAscending = true;
    }
    
    filteredData.sort((a, b) => {
        let aVal = a[column] || '';
        let bVal = b[column] || '';
        
        // Try to convert to numbers for numeric sorting
        const aNum = parseFloat(aVal);
        const bNum = parseFloat(bVal);
        
        if (!isNaN(aNum) && !isNaN(bNum)) {
            aVal = aNum;
            bVal = bNum;
        } else {
            aVal = aVal.toString().toLowerCase();
            bVal = bVal.toString().toLowerCase();
        }
        
        if (aVal < bVal) return sortAscending ? -1 : 1;
        if (aVal > bVal) return sortAscending ? 1 : -1;
        return 0;
    });
    
    currentPage = 0;
    updateTableData();
    updateSortIndicators();
}

// Update sort indicators with enhanced functionality
function updateSortIndicators() {
    const headers = document.querySelectorAll('th');
    headers.forEach(header => {
        const headerText = header.querySelector('.header-text');
        const sortBtn = header.querySelector('.sort-btn');
        
        header.classList.remove('sorted-asc', 'sorted-desc');
        sortBtn.classList.remove('sorted-asc', 'sorted-desc');
        
        if (headerText && headerText.textContent === sortColumn) {
            const sortClass = sortAscending ? 'sorted-asc' : 'sorted-desc';
            header.classList.add(sortClass);
            sortBtn.classList.add(sortClass);
            
            // Update sort button icon
            sortBtn.innerHTML = sortAscending ? 
                '<i class="fas fa-sort-up"></i>' : 
                '<i class="fas fa-sort-down"></i>';
        } else {
            sortBtn.innerHTML = '<i class="fas fa-sort"></i>';
        }
    });
}

// Populate sort options
function populateSortOptions() {
    const sortSelect = document.getElementById('sortColumn');
    sortSelect.innerHTML = '<option value="">None</option>';
    
    const headers = Object.keys(currentData[0] || {});
    headers.forEach(header => {
        const option = document.createElement('option');
        option.value = header;
        option.textContent = header;
        sortSelect.appendChild(option);
    });
}

// Update sorting from controls
function updateSorting() {
    const sortSelect = document.getElementById('sortColumn');
    const sortAsc = document.getElementById('sortAscending');
    
    if (sortSelect.value) {
        sortByColumn(sortSelect.value);
        sortAscending = sortAsc.checked;
    } else {
        sortColumn = null;
        filteredData = [...currentData];
        currentPage = 0;
        updateTableData();
        updateSortIndicators();
    }
}

// Apply filters
function applyFilters() {
    const globalFilter = document.getElementById('globalFilter').value.toLowerCase();
    
    filteredData = currentData.filter(row => {
        if (globalFilter) {
            const rowValues = Object.values(row).join(' ').toLowerCase();
            if (!rowValues.includes(globalFilter)) {
                return false;
            }
        }
        
        // Apply column-specific filters
        for (const [column, filterValue] of Object.entries(activeFilters)) {
            const cellValue = (row[column] || '').toString();
            
            // Check if it's a multi-value filter (separated by |)
            if (filterValue.includes('|')) {
                const allowedValues = filterValue.split('|');
                if (!allowedValues.includes(cellValue)) {
                    return false;
                }
            } else {
                // Single value filter
                if (!cellValue.toLowerCase().includes(filterValue.toLowerCase())) {
                    return false;
                }
            }
        }
        
        return true;
    });
    
    currentPage = 0;
    updateTableData();
    updateActiveFilters();
}

// Update active filters display
function updateActiveFilters() {
    const activeFiltersDiv = document.getElementById('activeFilters');
    const filterTagsDiv = document.getElementById('filterTags');
    
    const globalFilter = document.getElementById('globalFilter').value;
    const allFilters = { ...activeFilters };
    if (globalFilter) {
        allFilters['Global'] = globalFilter;
    }
    
    if (Object.keys(allFilters).length === 0) {
        activeFiltersDiv.style.display = 'none';
        return;
    }
    
    filterTagsDiv.innerHTML = '';
    Object.entries(allFilters).forEach(([key, value]) => {
        const tag = document.createElement('span');
        tag.className = 'filter-tag';
        tag.innerHTML = `${key}: ${value} <span class="remove" onclick="removeFilter('${key}')">&times;</span>`;
        filterTagsDiv.appendChild(tag);
    });
    
    activeFiltersDiv.style.display = 'block';
}

// Remove filter
function removeFilter(filterKey) {
    if (filterKey === 'Global') {
        document.getElementById('globalFilter').value = '';
    } else {
        delete activeFilters[filterKey];
    }
    applyFilters();
}

// Clear all filters
function clearFilters() {
    document.getElementById('globalFilter').value = '';
    activeFilters = {};
    applyFilters();
}

// Update pagination
function updatePagination() {
    rowsPerPage = parseInt(document.getElementById('rowsPerPage').value);
    currentPage = 0;
    updateTableData();
}

// Previous page
function previousPage() {
    if (currentPage > 0) {
        currentPage--;
        updateTableData();
    }
}

// Next page
function nextPage() {
    const maxPage = Math.ceil(filteredData.length / rowsPerPage) - 1;
    if (currentPage < maxPage) {
        currentPage++;
        updateTableData();
    }
}

// Update pagination info
function updatePaginationInfo() {
    const pagination = document.getElementById('pagination');
    const tableInfo = document.querySelector('.table-info');
    
    // Show/hide pagination and table info based on data availability
    if (filteredData.length === 0) {
        if (pagination) pagination.style.display = 'none';
        if (tableInfo) tableInfo.style.display = 'none';
        return;
    }
    
    // Show pagination and table info when data is available
    if (pagination) pagination.style.display = 'block';
    if (tableInfo) tableInfo.style.display = 'block';
    
    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    const pageInfo = document.getElementById('pageInfo');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    pageInfo.textContent = `Page ${currentPage + 1} of ${totalPages}`;
    prevBtn.disabled = currentPage === 0;
    nextBtn.disabled = currentPage >= totalPages - 1;
}

// Update table info
function updateTableInfo() {
    const showingRows = document.getElementById('showingRows');
    const totalRows = document.getElementById('totalRows');
    
    if (filteredData.length === 0) {
        showingRows.textContent = '0';
        totalRows.textContent = '0';
        return;
    }
    
    const startIndex = currentPage * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, filteredData.length);
    
    showingRows.textContent = `${startIndex + 1}-${endIndex}`;
    totalRows.textContent = filteredData.length;
}

// Add column
function addColumn() {
    if (currentData.length === 0) {
        alert('Please load data first.');
        return;
    }
    showModal('addColumnModal');
}

// Confirm add column
function confirmAddColumn() {
    const columnName = document.getElementById('newColumnName').value.trim();
    
    if (!columnName) {
        alert('Please enter a column name.');
        return;
    }
    
    if (currentData.length > 0 && columnName in currentData[0]) {
        alert('Column already exists.');
        return;
    }
    
    // Add column to all data
    currentData.forEach(row => {
        row[columnName] = '';
    });
    
    filteredData = [...currentData];
    populateTable();
    populateSortOptions();
    closeModal('addColumnModal');
    document.getElementById('newColumnName').value = '';
}

// Add row
function addRow() {
    if (currentData.length === 0) {
        alert('Please load data first.');
        return;
    }
    
    const newRow = {};
    Object.keys(currentData[0]).forEach(key => {
        newRow[key] = '';
    });
    
    currentData.push(newRow);
    filteredData = [...currentData];
    updateTableData();
    updatePaginationInfo();
    updateTableInfo();
}

// Export data
function exportData(format) {
    if (filteredData.length === 0) {
        alert('No data to export.');
        return;
    }
    
    let content = '';
    let filename = 'exported_data';
    
    if (format === 'csv') {
        const headers = Object.keys(filteredData[0]);
        content = headers.join(',') + '\n';
        
        filteredData.forEach(row => {
            const values = headers.map(header => {
                const value = row[header] || '';
                return `"${value}"`;
            });
            content += values.join(',') + '\n';
        });
        
        filename += '.csv';
    } else if (format === 'excel') {
        // For Excel export, we'll create a CSV that Excel can open
        const headers = Object.keys(filteredData[0]);
        content = headers.join(',') + '\n';
        
        filteredData.forEach(row => {
            const values = headers.map(header => {
                const value = row[header] || '';
                return `"${value}"`;
            });
            content += values.join(',') + '\n';
        });
        
        filename += '.csv';
    }
    
    downloadFile(content, filename, 'text/csv');
}

// Download file
function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Reset data
function resetData() {
    if (confirm('Are you sure you want to reset all changes?')) {
        currentData = [...originalData];
        filteredData = [...originalData];
        currentPage = 0;
        sortColumn = null;
        sortAscending = true;
        activeFilters = {};
        document.getElementById('globalFilter').value = '';
        document.getElementById('sortColumn').value = '';
        document.getElementById('sortAscending').checked = true;
        
        populateTable();
        updateSortIndicators();
        updateActiveFilters();
    }
}

// Show table section
function showTableSection() {
    const uploadSection = document.getElementById('uploadSection');
    if (uploadSection) uploadSection.style.display = 'none';
    const tableSection = document.getElementById('tableSection');
    if (tableSection) tableSection.style.display = 'block';
    const aiSection = document.getElementById('aiSection');
    if (aiSection) aiSection.style.display = 'block';
    // Initialize dashboard if data is available with proper timing
    if (currentData.length > 0) {
        console.log('=== Initializing dashboard in showTableSection ===');
        console.log('Data length:', currentData.length);
        setTimeout(() => {
            try {
                console.log('Calling dashboard initialization functions...');
                updateDashboardMetrics();
                generateDataInsights();
                populateChartOptions();
                generateQuickCharts();
                console.log('Dashboard initialization completed');
            } catch (error) {
                console.error('Error initializing dashboard:', error);
                setTimeout(() => {
                    try {
                        console.log('Retrying dashboard initialization...');
                        const elements = checkDashboardElements();
                        if (elements.xAxis && elements.yAxis) {
                            populateChartOptions();
                            console.log('Chart options populated on retry');
                        }
                    } catch (retryError) {
                        console.error('Dashboard initialization retry failed:', retryError);
                    }
                }, 1000);
            }
        }, 200);
    }
}

// Show modal
function showModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

// Close modal
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Show loading
function showLoading() {
    document.getElementById('loadingOverlay').style.display = 'flex';
}

// Hide loading
function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

// AI Question handling
function handleAIQuestion(event) {
    if (event.key === 'Enter') {
        askAI();
    }
}

// Ask AI (integrated with Flask backend)
async function askAI() {
    const question = document.getElementById('aiQuestion').value.trim();
    if (!question) {
        alert('Please enter a question.');
        return;
    }
    
    if (currentData.length === 0) {
        alert('Please upload data first.');
        return;
    }
    
    // Show loading
    showLoading();
    
    try {
        // Convert current data to CSV format
        const headers = Object.keys(currentData[0]);
        let csvData = headers.join(',') + '\n';
        
        currentData.forEach(row => {
            const values = headers.map(header => {
                const value = row[header] || '';
                return `"${value}"`;
            });
            csvData += values.join(',') + '\n';
        });
        
        // Send request to Flask backend
        const response = await fetch('/api/ai-analysis', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                csvData: csvData,
                question: question
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            document.getElementById('aiResponseText').textContent = result.response;
            document.getElementById('aiResponse').style.display = 'block';
        } else {
            document.getElementById('aiResponseText').textContent = `Error: ${result.error}`;
            document.getElementById('aiResponse').style.display = 'block';
        }
        
    } catch (error) {
        console.error('Error calling AI API:', error);
        document.getElementById('aiResponseText').textContent = `Error connecting to AI service: ${error.message}. Please ensure the server is running and Ollama is available.`;
        document.getElementById('aiResponse').style.display = 'block';
    } finally {
        hideLoading();
    }
}

// Show column filter
function showColumnFilter(columnName) {
    const uniqueValues = [...new Set(currentData.map(row => row[columnName] || '').filter(val => val !== ''))];
    
    // Create filter modal
    const filterModal = document.createElement('div');
    filterModal.className = 'modal';
    filterModal.id = 'filterModal';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content filter-modal';
    
    modalContent.innerHTML = `
        <h3>Filter: ${columnName}</h3>
        <div class="filter-options">
            <div class="filter-input-group">
                <label>Search:</label>
                <input type="text" id="columnFilterInput" placeholder="Type to filter..." onkeyup="filterColumnValues()">
            </div>
            <div class="filter-values" id="filterValues">
                ${uniqueValues.map(value => `
                    <label class="filter-checkbox">
                        <input type="checkbox" value="${value}" checked>
                        <span>${value}</span>
                    </label>
                `).join('')}
            </div>
        </div>
        <div class="filter-actions">
            <button class="btn btn-secondary" onclick="selectAllFilters()">Select All</button>
            <button class="btn btn-secondary" onclick="clearAllFilters()">Clear All</button>
            <button class="btn btn-primary" onclick="applyColumnFilter('${columnName}')">Apply Filter</button>
            <button class="btn btn-secondary" onclick="closeFilterModal()">Cancel</button>
        </div>
    `;
    
    filterModal.appendChild(modalContent);
    document.body.appendChild(filterModal);
    filterModal.style.display = 'block';
}

// Filter column values
function filterColumnValues() {
    const searchTerm = document.getElementById('columnFilterInput').value.toLowerCase();
    const checkboxes = document.querySelectorAll('#filterValues input[type="checkbox"]');
    
    checkboxes.forEach(checkbox => {
        const label = checkbox.parentElement;
        const text = label.querySelector('span').textContent.toLowerCase();
        label.style.display = text.includes(searchTerm) ? 'block' : 'none';
    });
}

// Select all filters
function selectAllFilters() {
    const checkboxes = document.querySelectorAll('#filterValues input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        if (checkbox.parentElement.style.display !== 'none') {
            checkbox.checked = true;
        }
    });
}

// Clear all filters
function clearAllFilters() {
    const checkboxes = document.querySelectorAll('#filterValues input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
}

// Apply column filter
function applyColumnFilter(columnName) {
    const selectedValues = Array.from(document.querySelectorAll('#filterValues input[type="checkbox"]:checked'))
        .map(checkbox => checkbox.value);
    
    if (selectedValues.length > 0) {
        activeFilters[columnName] = selectedValues.join('|');
    } else {
        delete activeFilters[columnName];
    }
    
    closeFilterModal();
    applyFilters();
}

// Close filter modal
function closeFilterModal() {
    const modal = document.getElementById('filterModal');
    if (modal) {
        modal.remove();
    }
}

// Show column menu
function showColumnMenu(columnName, event) {
    const menu = document.createElement('div');
    menu.className = 'column-menu';
    menu.id = 'columnMenu';
    
    // Get column statistics
    const values = currentData.map(row => row[columnName] || '').filter(val => val !== '');
    const numericValues = values.map(v => parseFloat(v)).filter(v => !isNaN(v));
    const isNumeric = numericValues.length > values.length * 0.8;
    
    menu.innerHTML = `
        <div class="menu-header">
            <strong>${columnName}</strong>
        </div>
        <div class="menu-section">
            <div class="menu-item" onclick="sortByColumn('${columnName}')">
                <i class="fas fa-sort"></i> Sort A-Z
            </div>
            <div class="menu-item" onclick="sortByColumn('${columnName}', false)">
                <i class="fas fa-sort-down"></i> Sort Z-A
            </div>
        </div>
        <div class="menu-section">
            <div class="menu-item" onclick="showColumnFilter('${columnName}')">
                <i class="fas fa-filter"></i> Filter
            </div>
            <div class="menu-item" onclick="clearColumnFilter('${columnName}')">
                <i class="fas fa-times"></i> Clear Filter
            </div>
        </div>
        ${isNumeric ? `
        <div class="menu-section">
            <div class="menu-item" onclick="showColumnStats('${columnName}')">
                <i class="fas fa-chart-bar"></i> Statistics
            </div>
        </div>
        ` : ''}
        <div class="menu-section">
            <div class="menu-item" onclick="hideColumn('${columnName}')">
                <i class="fas fa-eye-slash"></i> Hide Column
            </div>
            <div class="menu-item" onclick="renameColumn('${columnName}')">
                <i class="fas fa-edit"></i> Rename Column
            </div>
        </div>
    `;
    
    // Position menu
    const rect = event.target.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.top = rect.bottom + 'px';
    menu.style.left = rect.left + 'px';
    menu.style.zIndex = '1000';
    
    document.body.appendChild(menu);
    
    // Close menu when clicking outside
    setTimeout(() => {
        document.addEventListener('click', closeColumnMenu);
    }, 100);
}

// Close column menu
function closeColumnMenu(event) {
    const menu = document.getElementById('columnMenu');
    if (menu && !menu.contains(event.target)) {
        menu.remove();
        document.removeEventListener('click', closeColumnMenu);
    }
}

// Clear column filter
function clearColumnFilter(columnName) {
    delete activeFilters[columnName];
    applyFilters();
    closeColumnMenu();
}

// Show column statistics
function showColumnStats(columnName) {
    const values = currentData.map(row => row[columnName] || '').filter(val => val !== '');
    const numericValues = values.map(v => parseFloat(v)).filter(v => !isNaN(v));
    
    if (numericValues.length === 0) {
        alert('No numeric data found in this column.');
        return;
    }
    
    const stats = {
        count: numericValues.length,
        sum: numericValues.reduce((a, b) => a + b, 0),
        mean: numericValues.reduce((a, b) => a + b, 0) / numericValues.length,
        min: Math.min(...numericValues),
        max: Math.max(...numericValues),
        median: numericValues.sort((a, b) => a - b)[Math.floor(numericValues.length / 2)]
    };
    
    const statsModal = document.createElement('div');
    statsModal.className = 'modal';
    statsModal.id = 'statsModal';
    
    statsModal.innerHTML = `
        <div class="modal-content">
            <h3>Statistics: ${columnName}</h3>
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-label">Count</div>
                    <div class="stat-value">${stats.count}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Sum</div>
                    <div class="stat-value">${stats.sum.toFixed(2)}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Mean</div>
                    <div class="stat-value">${stats.mean.toFixed(2)}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Median</div>
                    <div class="stat-value">${stats.median.toFixed(2)}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Min</div>
                    <div class="stat-value">${stats.min.toFixed(2)}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Max</div>
                    <div class="stat-value">${stats.max.toFixed(2)}</div>
                </div>
            </div>
            <div class="modal-buttons">
                <button class="btn btn-primary" onclick="closeStatsModal()">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(statsModal);
    statsModal.style.display = 'block';
}

// Close stats modal
function closeStatsModal() {
    const modal = document.getElementById('statsModal');
    if (modal) {
        modal.remove();
    }
}

// Hide column
function hideColumn(columnName) {
    if (confirm(`Are you sure you want to hide the column "${columnName}"?`)) {
        // This would require updating the data structure to track hidden columns
        // For now, we'll just show a message
        alert('Column hiding functionality will be implemented in the next update.');
    }
    closeColumnMenu();
}

// Rename column
function renameColumn(columnName) {
    const newName = prompt(`Enter new name for column "${columnName}":`, columnName);
    if (newName && newName.trim() && newName !== columnName) {
        // Update column name in all data
        currentData.forEach(row => {
            row[newName] = row[columnName];
            delete row[columnName];
        });
        
        // Update filtered data
        filteredData.forEach(row => {
            row[newName] = row[columnName];
            delete row[columnName];
        });
        
        // Update original data
        originalData.forEach(row => {
            row[newName] = row[columnName];
            delete row[columnName];
        });
        
        // Update active filters
        if (activeFilters[columnName]) {
            activeFilters[newName] = activeFilters[columnName];
            delete activeFilters[columnName];
        }
        
        // Update sort column
        if (sortColumn === columnName) {
            sortColumn = newName;
        }
        
        // Refresh table
        populateTable();
        populateSortOptions();
        updateActiveFilters();
    }
    closeColumnMenu();
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
} 

// Tab switching functionality
function switchTab(tabName) {
    console.log('=== Switching to tab ===:', tabName);
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Show/hide tab content
    document.getElementById('tableTab').style.display = tabName === 'table' ? 'block' : 'none';
    document.getElementById('dashboardTab').style.display = tabName === 'dashboard' ? 'block' : 'none';
    
    // Ensure proper tab content visibility
    if (tabName === 'dashboard') {
        // Hide table-specific elements in dashboard tab
        const tableContainer = document.querySelector('.table-container');
        const pagination = document.getElementById('pagination');
        const tableInfo = document.querySelector('.table-info');
        const activeFilters = document.getElementById('activeFilters');
        
        if (tableContainer) tableContainer.style.display = 'none';
        if (pagination) pagination.style.display = 'none';
        if (tableInfo) tableInfo.style.display = 'none';
        if (activeFilters) activeFilters.style.display = 'none';
        
        // Show dashboard content
        const dashboardGrid = document.querySelector('.dashboard-grid');
        if (dashboardGrid) dashboardGrid.style.display = 'block';
    } else if (tabName === 'table') {
        // Show table-specific elements in table tab
        const tableContainer = document.querySelector('.table-container');
        const pagination = document.getElementById('pagination');
        const tableInfo = document.querySelector('.table-info');
        
        if (tableContainer) tableContainer.style.display = 'block';
        if (pagination && currentData.length > 0) pagination.style.display = 'block';
        if (tableInfo && currentData.length > 0) tableInfo.style.display = 'block';
    }
    
    // If switching to dashboard, update metrics and insights with better timing
    if (tabName === 'dashboard' && currentData.length > 0) {
        console.log('Initializing dashboard with data length:', currentData.length);
        
        // Initialize chart area with placeholder if empty
        const chartArea = document.getElementById('chartArea');
        if (chartArea && chartArea.innerHTML.trim() === '') {
            chartArea.innerHTML = '<div class="chart-placeholder"><i class="fas fa-chart-pie"></i><p>Select chart type and columns to create a visualization</p></div>';
        }
        
        // Use a longer delay to ensure DOM elements are ready
        setTimeout(() => {
            try {
                console.log('Initializing dashboard functions...');
                updateDashboardMetrics();
                generateDataInsights();
                populateChartOptions();
                generateQuickCharts();
                console.log('Dashboard initialization completed successfully');
            } catch (error) {
                console.error('Error initializing dashboard:', error);
                // Try again with an even longer delay
                setTimeout(() => {
                    try {
                        console.log('Retrying dashboard initialization...');
                        updateDashboardMetrics();
                        generateDataInsights();
                        populateChartOptions();
                        generateQuickCharts();
                        console.log('Dashboard initialization retry completed');
                    } catch (retryError) {
                        console.error('Dashboard initialization retry failed:', retryError);
                        // Final attempt with even longer delay
                        setTimeout(() => {
                            try {
                                console.log('Final dashboard initialization attempt...');
                                const elements = checkDashboardElements();
                                if (elements.xAxis && elements.yAxis) {
                                    populateChartOptions();
                                    console.log('Chart options populated on final attempt');
                                }
                            } catch (finalError) {
                                console.error('Final dashboard initialization failed:', finalError);
                            }
                        }, 1000);
                    }
                }, 500);
            }
        }, 300);
    } else if (tabName === 'dashboard' && currentData.length === 0) {
        console.log('No data available for dashboard');
        // Show placeholder for empty dashboard
        const chartArea = document.getElementById('chartArea');
        if (chartArea) {
            chartArea.innerHTML = '<div class="chart-placeholder"><i class="fas fa-database"></i><p>Upload data to create visualizations</p></div>';
        }
    }
}

// Generate chart HTML
function generateChartHtml(chartType, data, xAxis, yAxis) {
    console.log('generateChartHtml called with:', { chartType, dataLength: data.length, xAxis, yAxis });
    
    if (data.length === 0) {
        return '<div class="chart-placeholder"><p>No data available for this chart</p></div>';
    }
    
    const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#fa709a', '#fee140'];
    
    if (chartType === 'bar') {
        const maxValue = Math.max(...data.map(d => d.y));
        if (maxValue === 0) return '<div class="chart-placeholder"><p>No data to display</p></div>';
        
        return `
            <div class="chart-container-inner">
                <div class="chart-bars">
                    ${data.map((d, i) => `
                        <div class="chart-bar-item">
                            <div class="chart-bar" style="height: ${(d.y / maxValue) * 300}px; background: ${colors[i % colors.length]}"></div>
                            <div class="chart-label">${d.x}</div>
                            <div class="chart-value">${d.y}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } else if (chartType === 'line') {
        const maxY = Math.max(...data.map(d => d.y));
        if (maxY === 0) return '<div class="chart-placeholder"><p>No data to display</p></div>';
        
        const points = data.map((d, i) => {
            const x = (i / (data.length - 1)) * 700 + 50;
            const y = 400 - (d.y / maxY) * 300;
            return `${x},${y}`;
        }).join(' ');
        
        return `
            <div class="chart-container-inner">
                <svg width="100%" height="400" viewBox="0 0 800 400">
                    <polyline fill="none" stroke="#667eea" stroke-width="3" points="${points}"/>
                    ${data.map((d, i) => {
                        const x = (i / (data.length - 1)) * 700 + 50;
                        const y = 400 - (d.y / maxY) * 300;
                        return `<circle cx="${x}" cy="${y}" r="4" fill="#667eea"/>`;
                    }).join('')}
                </svg>
            </div>
        `;
    } else if (chartType === 'pie') {
        try {
            console.log('Generating pie chart with data:', data);
        const total = data.reduce((sum, d) => sum + d.value, 0);
        if (total === 0) return '<div class="chart-placeholder"><p>No data to display</p></div>';
        
            let currentAngle = -90; // Start from top (12 o'clock position)
        const centerX = 200;
        const centerY = 200;
        const radius = 150;
        
            const pieSlices = data.map((d, i) => {
                        const angle = (d.value / total) * 360;
                        const startAngle = currentAngle;
                        const endAngle = currentAngle + angle;
                        
                // Convert angles to radians
                const startRad = startAngle * Math.PI / 180;
                const endRad = endAngle * Math.PI / 180;
                
                // Calculate start and end points
                const x1 = centerX + radius * Math.cos(startRad);
                const y1 = centerY + radius * Math.sin(startRad);
                const x2 = centerX + radius * Math.cos(endRad);
                const y2 = centerY + radius * Math.sin(endRad);
                
                // Determine if we need a large arc flag
                        const largeArcFlag = angle > 180 ? 1 : 0;
                
                // Create the path for the pie slice - fixed SVG path
                        const path = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
                        
                        currentAngle += angle;
                        
                        return `<path d="${path}" fill="${colors[i % colors.length]}" stroke="white" stroke-width="2"/>`;
            }).join('');
            
            const legend = data.map((d, i) => `
                        <div class="legend-item">
                            <span class="legend-color" style="background: ${colors[i % colors.length]}"></span>
                            <span>${d.label || d.x}: ${d.value} (${((d.value / total) * 100).toFixed(1)}%)</span>
                        </div>
            `).join('');
            
            console.log('Pie chart generated successfully');
            return `
                <div class="chart-container-inner">
                    <svg width="400" height="400" viewBox="0 0 400 400">
                        ${pieSlices}
                    </svg>
                    <div class="pie-legend">
                        ${legend}
                </div>
            </div>
        `;
        } catch (error) {
            console.error('Error generating pie chart:', error);
            return '<div class="chart-placeholder"><p>Error generating pie chart</p></div>';
        }
    } else if (chartType === 'scatter') {
        const maxX = Math.max(...data.map(d => d.x));
        const maxY = Math.max(...data.map(d => d.y));
        if (maxX === 0 || maxY === 0) return '<div class="chart-placeholder"><p>No data to display</p></div>';
        
        return `
            <div class="chart-container-inner">
                <svg width="100%" height="400" viewBox="0 0 800 400">
                    ${data.map(d => {
                        const x = (d.x / maxX) * 700 + 50;
                        const y = 400 - (d.y / maxY) * 300;
                        return `<circle cx="${x}" cy="${y}" r="6" fill="#667eea" opacity="0.7"/>`;
                    }).join('')}
                </svg>
            </div>
        `;
    } else if (chartType === 'area') {
        const maxY = Math.max(...data.map(d => d.y));
        if (maxY === 0) return '<div class="chart-placeholder"><p>No data to display</p></div>';
        
        const points = data.map((d, i) => {
            const x = (i / (data.length - 1)) * 700 + 50;
            const y = 400 - (d.y / maxY) * 300;
            return `${x},${y}`;
        }).join(' ');
        
        const areaPoints = `${points} L ${(data.length - 1) / (data.length - 1) * 700 + 50},400 L 50,400 Z`;
        
        return `
            <div class="chart-container-inner">
                <svg width="100%" height="400" viewBox="0 0 800 400">
                    <polygon fill="#667eea" opacity="0.3" points="${areaPoints}"/>
                    <polyline fill="none" stroke="#667eea" stroke-width="3" points="${points}"/>
                </svg>
            </div>
        `;
    } else if (chartType === 'histogram') {
        const maxValue = Math.max(...data.map(d => d.y));
        if (maxValue === 0) return '<div class="chart-placeholder"><p>No data to display</p></div>';
        
        return `
            <div class="chart-container-inner">
                <div class="chart-bars">
                    ${data.map((d, i) => `
                        <div class="chart-bar-item">
                            <div class="chart-bar" style="height: ${(d.y / maxValue) * 300}px; background: ${colors[i % colors.length]}"></div>
                            <div class="chart-label">${d.x}</div>
                            <div class="chart-value">${d.y}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } else if (chartType === 'heatmap') {
        // Heatmap implementation
        const maxValue = Math.max(...data.map(d => d.value));
        if (maxValue === 0) return '<div class="chart-placeholder"><p>No data to display</p></div>';
        
        const gridSize = Math.ceil(Math.sqrt(data.length));
        const cellSize = 400 / gridSize;
        
        return `
            <div class="chart-container-inner">
                <svg width="400" height="400" viewBox="0 0 400 400">
                    ${data.map((d, i) => {
                        const row = Math.floor(i / gridSize);
                        const col = i % gridSize;
                        const x = col * cellSize;
                        const y = row * cellSize;
                        const color = getHeatmapColor(d.value, maxValue);
                        
                        return `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${color}" stroke="white" stroke-width="1">
                            <title>${d.x}: ${d.value}</title>
                        </rect>`;
                    }).join('')}
                </svg>
            </div>
        `;
    } else if (chartType === 'boxplot') {
        // Box plot implementation
        const maxValue = Math.max(...data.map(d => d.max || d.y));
        if (maxValue === 0) return '<div class="chart-placeholder"><p>No data to display</p></div>';
        
        return `
            <div class="chart-container-inner">
                <div class="boxplot-container" style="display: flex; align-items: center; justify-content: space-around; height: 300px; padding: 20px;">
                    ${data.map((d, i) => {
                        const height = ((d.max || d.y) / maxValue) * 200;
                        const q1Height = (d.q1 / maxValue) * 200;
                        const q3Height = (d.q3 / maxValue) * 200;
                        const medianHeight = (d.y / maxValue) * 200;
                        
                        return `
                            <div class="boxplot-item" style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
                                <div class="boxplot-box" style="width: 40px; height: ${height}px; background: ${colors[i % colors.length]}; border-radius: 4px; position: relative;">
                                    <div class="boxplot-median" style="position: absolute; top: ${medianHeight}px; left: 0; right: 0; height: 2px; background: white;"></div>
                                    <div class="boxplot-q1" style="position: absolute; top: ${q1Height}px; left: 0; right: 0; height: 1px; background: rgba(255,255,255,0.7);"></div>
                                    <div class="boxplot-q3" style="position: absolute; top: ${q3Height}px; left: 0; right: 0; height: 1px; background: rgba(255,255,255,0.7);"></div>
                                </div>
                                <div class="boxplot-label" style="font-size: 12px; color: #666; text-align: center;">${d.x}</div>
                                <div class="boxplot-value" style="font-size: 12px; font-weight: bold; color: #333;">${d.count || d.y}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    } else if (chartType === 'funnel') {
        // Funnel chart implementation
        const maxValue = Math.max(...data.map(d => d.y));
        if (maxValue === 0) return '<div class="chart-placeholder"><p>No data to display</p></div>';
        
        return `
            <div class="chart-container-inner">
                <div class="funnel-container" style="display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 20px;">
                    ${data.map((d, i) => {
                        const width = (d.y / maxValue) * 300;
                        return `
                            <div class="funnel-item" style="display: flex; align-items: center; gap: 15px; width: 100%;">
                                <div class="funnel-bar" style="width: ${width}px; height: 30px; background: ${colors[i % colors.length]}; border-radius: 4px;"></div>
                                <div class="funnel-label" style="font-size: 14px; color: #333; min-width: 100px;">${d.x}</div>
                                <div class="funnel-value" style="font-size: 14px; font-weight: bold; color: #333;">${d.y}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    } else if (chartType === 'radar') {
        // Radar chart implementation
        const maxValue = Math.max(...data.map(d => d.y));
        if (maxValue === 0) return '<div class="chart-placeholder"><p>No data to display</p></div>';
        
        const centerX = 200;
        const centerY = 200;
        const maxRadius = 150;
        
        return `
            <div class="chart-container-inner">
                <svg width="400" height="400" viewBox="0 0 400 400">
                    <!-- Grid circles -->
                    <circle cx="${centerX}" cy="${centerY}" r="${maxRadius}" fill="none" stroke="#ddd" stroke-width="1"/>
                    <circle cx="${centerX}" cy="${centerY}" r="${maxRadius * 0.75}" fill="none" stroke="#ddd" stroke-width="1"/>
                    <circle cx="${centerX}" cy="${centerY}" r="${maxRadius * 0.5}" fill="none" stroke="#ddd" stroke-width="1"/>
                    <circle cx="${centerX}" cy="${centerY}" r="${maxRadius * 0.25}" fill="none" stroke="#ddd" stroke-width="1"/>
                    
                    <!-- Radar points and lines -->
                    ${data.map((d, i) => {
                        const angle = (i / data.length) * 2 * Math.PI;
                        const radius = (d.y / maxValue) * maxRadius;
                        const x = centerX + radius * Math.cos(angle);
                        const y = centerY + radius * Math.sin(angle);
                        
                        return `<circle cx="${x}" cy="${y}" r="4" fill="#667eea"/>`;
                    }).join('')}
                    
                    <!-- Connect points -->
                    <polyline fill="none" stroke="#667eea" stroke-width="2" points="${data.map((d, i) => {
                        const angle = (i / data.length) * 2 * Math.PI;
                        const radius = (d.y / maxValue) * maxRadius;
                        const x = centerX + radius * Math.cos(angle);
                        const y = centerY + radius * Math.sin(angle);
                        return `${x},${y}`;
                    }).join(' ')}"/>
                </svg>
            </div>
        `;
    }
    
    return '<div class="chart-placeholder"><p>Chart type not implemented</p></div>';
}

// Get heatmap color
function getHeatmapColor(value, maxValue) {
    const intensity = value / maxValue;
    const hue = 240 - (intensity * 240); // Blue to red
    return `hsl(${hue}, 70%, 50%)`;
}

// Enhanced populate chart options
function populateChartOptions() {
    console.log('populateChartOptions called');
    console.log('currentData length:', currentData.length);
    
    if (currentData.length === 0) {
        console.log('No data available for chart options');
        return;
    }
    
    const headers = Object.keys(currentData[0]);
    console.log('Headers found:', headers);
    
    const xAxisSelect = document.getElementById('xAxis');
    const yAxisSelect = document.getElementById('yAxis');
    const colorBySelect = document.getElementById('colorBy');
    
    console.log('DOM elements found:', {
        xAxisSelect: !!xAxisSelect,
        yAxisSelect: !!yAxisSelect,
        colorBySelect: !!colorBySelect
    });
    
    if (!xAxisSelect || !yAxisSelect || !colorBySelect) {
        console.error('Chart option elements not found in DOM');
        console.error('xAxisSelect:', xAxisSelect);
        console.error('yAxisSelect:', yAxisSelect);
        console.error('colorBySelect:', colorBySelect);
        return;
    }
    
    try {
        // Clear existing options
        xAxisSelect.innerHTML = '<option value="">Select Column</option>';
        yAxisSelect.innerHTML = '<option value="">Select Column</option>';
        colorBySelect.innerHTML = '<option value="">None</option>';
        
        // Add options
        headers.forEach((header, index) => {
            console.log(`Adding header option ${index + 1}:`, header);
            
            const xOption = document.createElement('option');
            xOption.value = header;
            xOption.textContent = header;
            xAxisSelect.appendChild(xOption);
            
            const yOption = document.createElement('option');
            yOption.value = header;
            yOption.textContent = header;
            yAxisSelect.appendChild(yOption);
            
            const colorOption = document.createElement('option');
            colorOption.value = header;
            colorOption.textContent = header;
            colorBySelect.appendChild(colorOption);
        });
        
        console.log('Chart options populated successfully');
        console.log('X-Axis options:', xAxisSelect.options.length);
        console.log('Y-Axis options:', yAxisSelect.options.length);
        console.log('Color By options:', colorBySelect.options.length);
        
        // Verify the options were actually added
        if (xAxisSelect.options.length <= 1) {
            console.warn('X-Axis options not properly populated');
        }
        if (yAxisSelect.options.length <= 1) {
            console.warn('Y-Axis options not properly populated');
        }
        if (colorBySelect.options.length <= 1) {
            console.warn('Color By options not properly populated');
        }
        
    } catch (error) {
        console.error('Error populating chart options:', error);
    }
}

// Enhanced generate quick charts
function generateQuickCharts() {
    if (currentData.length === 0) return;
    
    const headers = Object.keys(currentData[0]);
    const numericColumns = headers.filter(col => {
        const values = currentData.map(row => row[col]).filter(val => val !== '');
        const numericValues = values.map(v => parseFloat(v)).filter(v => !isNaN(v));
        return numericValues.length > values.length * 0.8;
    });
    
    const categoricalColumns = headers.filter(col => {
        const values = currentData.map(row => row[col]).filter(val => val !== '');
        const uniqueValues = [...new Set(values)];
        return uniqueValues.length < Math.min(20, values.length * 0.5);
    });
    
    const quickCharts = [];
    
    // Bar chart for categorical data
    if (categoricalColumns.length > 0) {
        const col = categoricalColumns[0];
        quickCharts.push({
            title: `${col} Distribution`,
            desc: `Bar chart showing the distribution of ${col}`,
            type: 'bar',
            xAxis: col,
            yAxis: 'Count'
        });
    }
    
    // Line chart for numeric data
    if (numericColumns.length > 0) {
        quickCharts.push({
            title: `${numericColumns[0]} Trend`,
            desc: `Line chart showing the trend of ${numericColumns[0]}`,
            type: 'line',
            xAxis: 'Index',
            yAxis: numericColumns[0]
        });
    }
    
    // Pie chart for categorical data
    if (categoricalColumns.length > 0) {
        const col = categoricalColumns[0];
        quickCharts.push({
            title: `${col} Breakdown`,
            desc: `Pie chart showing the breakdown of ${col}`,
            type: 'pie',
            xAxis: col,
            yAxis: 'Count'
        });
    }
    
    // Scatter plot for numeric data
    if (numericColumns.length > 1) {
        quickCharts.push({
            title: `${numericColumns[0]} vs ${numericColumns[1]}`,
            desc: `Scatter plot showing correlation between ${numericColumns[0]} and ${numericColumns[1]}`,
            type: 'scatter',
            xAxis: numericColumns[0],
            yAxis: numericColumns[1]
        });
    }
    
    // Area chart for numeric data
    if (numericColumns.length > 0) {
        quickCharts.push({
            title: `${numericColumns[0]} Area Chart`,
            desc: `Area chart showing the trend of ${numericColumns[0]}`,
            type: 'area',
            xAxis: 'Index',
            yAxis: numericColumns[0]
        });
    }
    
    // Histogram for numeric data
    if (numericColumns.length > 0) {
        quickCharts.push({
            title: `${numericColumns[0]} Distribution`,
            desc: `Histogram showing the distribution of ${numericColumns[0]}`,
            type: 'histogram',
            xAxis: 'Bins',
            yAxis: numericColumns[0]
        });
    }
    
    // Heatmap for numeric data
    if (numericColumns.length > 1) {
        quickCharts.push({
            title: `${numericColumns[0]} vs ${numericColumns[1]} Heatmap`,
            desc: `Heatmap showing correlation between ${numericColumns[0]} and ${numericColumns[1]}`,
            type: 'heatmap',
            xAxis: numericColumns[0],
            yAxis: numericColumns[1]
        });
    }
    
    // Box plot for numeric data
    if (numericColumns.length > 0) {
        quickCharts.push({
            title: `${numericColumns[0]} Box Plot`,
            desc: `Box plot showing the distribution of ${numericColumns[0]}`,
            type: 'boxplot',
            xAxis: 'Categories',
            yAxis: numericColumns[0]
        });
    }
    
    // Funnel chart for categorical data
    if (categoricalColumns.length > 0) {
        const col = categoricalColumns[0];
        quickCharts.push({
            title: `${col} Funnel`,
            desc: `Funnel chart showing the flow of ${col}`,
            type: 'funnel',
            xAxis: col,
            yAxis: 'Count'
        });
    }
    
    // Radar chart for numeric data
    if (numericColumns.length > 2) {
        quickCharts.push({
            title: `${numericColumns.slice(0, 3).join(', ')} Radar`,
            desc: `Radar chart showing multiple metrics`,
            type: 'radar',
            xAxis: 'Metrics',
            yAxis: 'Values'
        });
    }
    
    // Update quick charts grid
    const quickChartsGrid = document.getElementById('quickChartsGrid');
    quickChartsGrid.innerHTML = quickCharts.map(chart => `
        <div class="quick-chart-item" onclick="createQuickChart('${chart.type}', '${chart.xAxis}', '${chart.yAxis}')">
            <div class="quick-chart-title">${chart.title}</div>
            <div class="quick-chart-desc">${chart.desc}</div>
            <div class="quick-chart-preview chart-type-${chart.type}">
                <i class="fas fa-chart-${chart.type === 'scatter' ? 'scatter' : chart.type}"></i>
            </div>
        </div>
    `).join('');
}

// Add chart-specific CSS
const chartStyles = `
    .chart-container-inner {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .chart-bars {
        display: flex;
        align-items: end;
        gap: 20px;
        height: 300px;
        padding: 20px;
    }
    
    .chart-bar-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 5px;
    }
    
    .chart-bar {
        width: 40px;
        border-radius: 4px 4px 0 0;
        transition: all 0.3s ease;
    }
    
    .chart-bar:hover {
        opacity: 0.8;
    }
    
    .chart-label {
        font-size: 12px;
        color: #666;
        text-align: center;
        max-width: 60px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    
    .chart-value {
        font-size: 12px;
        font-weight: bold;
        color: #333;
    }
    
    .pie-legend {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 20px;
    }
    
    .legend-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
    }
    
    .legend-color {
        width: 16px;
        height: 16px;
        border-radius: 2px;
    }
`;

// Inject chart styles
const styleSheet = document.createElement('style');
styleSheet.textContent = chartStyles;
document.head.appendChild(styleSheet);

// Enhanced Dashboard Functions

// Update dashboard metrics with additional metrics
function updateDashboardMetrics() {
    if (currentData.length === 0) return;
    
    const headers = Object.keys(currentData[0]);
    const numericColumns = headers.filter(col => {
        const values = currentData.map(row => row[col]).filter(val => val !== '');
        const numericValues = values.map(v => parseFloat(v)).filter(v => !isNaN(v));
        return numericValues.length > values.length * 0.8;
    });
    
    const categoricalColumns = headers.filter(col => {
        const values = currentData.map(row => row[col]).filter(val => val !== '');
        const uniqueValues = [...new Set(values)];
        return uniqueValues.length < Math.min(20, values.length * 0.5);
    });
    
    let missingValues = 0;
    let totalValues = 0;
    currentData.forEach(row => {
        Object.values(row).forEach(value => {
            totalValues++;
            if (value === '' || value === null || value === undefined) {
                missingValues++;
            }
        });
    });
    
    // Calculate data quality percentage
    const dataQualityPercentage = totalValues > 0 ? Math.round(((totalValues - missingValues) / totalValues) * 100) : 0;
    
    // Calculate total unique values across all columns
    let totalUniqueValues = 0;
    headers.forEach(col => {
        const values = currentData.map(row => row[col]).filter(val => val !== '');
        totalUniqueValues += new Set(values).size;
    });
    
    // Update metric cards
    document.getElementById('totalRecordsValue').textContent = currentData.length;
    document.getElementById('numericColumnsValue').textContent = numericColumns.length;
    document.getElementById('categoricalColumnsValue').textContent = categoricalColumns.length;
    document.getElementById('missingDataValue').textContent = missingValues;
    document.getElementById('dataQualityValue').textContent = dataQualityPercentage + '%';
    document.getElementById('uniqueValuesValue').textContent = totalUniqueValues;
    
    // Update advanced analytics
    updateAdvancedAnalytics();
}

// Update advanced analytics
function updateAdvancedAnalytics() {
    if (currentData.length === 0) return;
    
    const headers = Object.keys(currentData[0]);
    const numericColumns = headers.filter(col => {
        const values = currentData.map(row => row[col]).filter(val => val !== '');
        const numericValues = values.map(v => parseFloat(v)).filter(v => !isNaN(v));
        return numericValues.length > values.length * 0.8;
    });
    
    // Statistical Summary
    updateStatisticalSummary(numericColumns);
    
    // Outlier Detection
    updateOutlierDetection(numericColumns);
    
    // Correlation Matrix
    updateCorrelationMatrix(numericColumns);
}

// Update statistical summary
function updateStatisticalSummary(numericColumns) {
    const statsGrid = document.getElementById('statisticalSummary');
    if (!statsGrid) return;
    
    let statsHtml = '';
    
    numericColumns.forEach(col => {
        const values = currentData.map(row => parseFloat(row[col])).filter(v => !isNaN(v));
        if (values.length > 0) {
            const min = Math.min(...values);
            const max = Math.max(...values);
            const avg = values.reduce((a, b) => a + b, 0) / values.length;
            const sorted = values.sort((a, b) => a - b);
            const median = sorted.length % 2 === 0 ? 
                (sorted[sorted.length/2 - 1] + sorted[sorted.length/2]) / 2 : 
                sorted[Math.floor(sorted.length/2)];
            
            statsHtml += `
                <div class="stat-item">
                    <div class="stat-label">${col}</div>
                    <div class="stat-value">Min: ${min.toFixed(2)}</div>
                    <div class="stat-value">Max: ${max.toFixed(2)}</div>
                    <div class="stat-value">Avg: ${avg.toFixed(2)}</div>
                    <div class="stat-value">Median: ${median.toFixed(2)}</div>
                </div>
            `;
        }
    });
    
    statsGrid.innerHTML = statsHtml || '<div class="stat-item">No numeric data available</div>';
}

// Update outlier detection
function updateOutlierDetection(numericColumns) {
    const outliersList = document.getElementById('outlierDetection');
    if (!outliersList) return;
    
    let outliersHtml = '';
    
    numericColumns.forEach(col => {
        const values = currentData.map(row => parseFloat(row[col])).filter(v => !isNaN(v));
        if (values.length > 0) {
            const sorted = values.sort((a, b) => a - b);
            const q1 = sorted[Math.floor(sorted.length * 0.25)];
            const q3 = sorted[Math.floor(sorted.length * 0.75)];
            const iqr = q3 - q1;
            const lowerBound = q1 - 1.5 * iqr;
            const upperBound = q3 + 1.5 * iqr;
            
            const outliers = values.filter(v => v < lowerBound || v > upperBound);
            
            if (outliers.length > 0) {
                outliersHtml += `
                    <div class="outlier-item">
                        <span>${col}: ${outliers.length} outliers</span>
                        <span>Range: ${Math.min(...outliers).toFixed(2)} - ${Math.max(...outliers).toFixed(2)}</span>
                    </div>
                `;
            }
        }
    });
    
    outliersList.innerHTML = outliersHtml || '<div class="outlier-item">No outliers detected</div>';
}

// Update correlation matrix
function updateCorrelationMatrix(numericColumns) {
    const correlationMatrix = document.getElementById('correlationMatrix');
    if (!correlationMatrix) return;
    
    if (numericColumns.length < 2) {
        correlationMatrix.innerHTML = '<div class="correlation-cell">Need at least 2 numeric columns</div>';
        return;
    }
    
    let matrixHtml = '';
    
    // Header row
    matrixHtml += '<div class="correlation-cell">Column</div>';
    numericColumns.forEach(col => {
        matrixHtml += `<div class="correlation-cell">${col}</div>`;
    });
    
    // Correlation values
    numericColumns.forEach(col1 => {
        matrixHtml += `<div class="correlation-cell">${col1}</div>`;
        numericColumns.forEach(col2 => {
            if (col1 === col2) {
                matrixHtml += '<div class="correlation-cell">1.00</div>';
            } else {
                const correlation = calculateCorrelation(col1, col2);
                matrixHtml += `<div class="correlation-cell">${correlation.toFixed(2)}</div>`;
            }
        });
    });
    
    correlationMatrix.innerHTML = matrixHtml;
}

// Calculate correlation between two columns
function calculateCorrelation(col1, col2) {
    const values1 = currentData.map(row => parseFloat(row[col1])).filter(v => !isNaN(v));
    const values2 = currentData.map(row => parseFloat(row[col2])).filter(v => !isNaN(v));
    
    if (values1.length !== values2.length || values1.length === 0) return 0;
    
    const mean1 = values1.reduce((a, b) => a + b, 0) / values1.length;
    const mean2 = values2.reduce((a, b) => a + b, 0) / values2.length;
    
    let numerator = 0;
    let denominator1 = 0;
    let denominator2 = 0;
    
    for (let i = 0; i < values1.length; i++) {
        const diff1 = values1[i] - mean1;
        const diff2 = values2[i] - mean2;
        numerator += diff1 * diff2;
        denominator1 += diff1 * diff1;
        denominator2 += diff2 * diff2;
    }
    
    const denominator = Math.sqrt(denominator1 * denominator2);
    return denominator === 0 ? 0 : numerator / denominator;
}

// Show advanced filters modal
function showAdvancedFilters() {
    populateColumnFilters();
    showModal('advancedFiltersModal');
}

// Populate column filters
function populateColumnFilters() {
    if (currentData.length === 0) return;
    
    const headers = Object.keys(currentData[0]);
    const columnFilters = document.getElementById('columnFilters');
    
    let filtersHtml = '';
    headers.forEach(header => {
        const values = currentData.map(row => row[header]).filter(val => val !== '');
        const uniqueValues = [...new Set(values)].slice(0, 10); // Limit to 10 values
        
        filtersHtml += `
            <div class="filter-item">
                <label>${header}:</label>
                <select onchange="applyColumnFilter('${header}', this.value)">
                    <option value="">All</option>
                    ${uniqueValues.map(val => `<option value="${val}">${val}</option>`).join('')}
                </select>
            </div>
        `;
    });
    
    columnFilters.innerHTML = filtersHtml;
}

// Apply column filter
function applyColumnFilter(column, value) {
    if (!value) {
        delete activeFilters[column];
    } else {
        activeFilters[column] = value;
    }
    applyFilters();
}

// Apply date filter
function applyDateFilter() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (startDate && endDate) {
        activeFilters.dateRange = { start: startDate, end: endDate };
    } else {
        delete activeFilters.dateRange;
    }
    applyFilters();
}

// Apply numeric filter
function applyNumericFilter() {
    const minValue = document.getElementById('minValue').value;
    const maxValue = document.getElementById('maxValue').value;
    
    if (minValue || maxValue) {
        activeFilters.numericRange = { min: minValue, max: maxValue };
    } else {
        delete activeFilters.numericRange;
    }
    applyFilters();
}

// Apply custom filter
function applyCustomFilter() {
    const customExpression = document.getElementById('customFilter').value;
    if (customExpression) {
        try {
            // Simple expression evaluation (in a real implementation, you'd use a proper expression parser)
            activeFilters.customExpression = customExpression;
        } catch (error) {
            alert('Invalid expression: ' + error.message);
        }
    } else {
        delete activeFilters.customExpression;
    }
    applyFilters();
}

// Apply advanced filters
function applyAdvancedFilters() {
    applyFilters();
    closeModal('advancedFiltersModal');
}

// Clear advanced filters
function clearAdvancedFilters() {
    activeFilters = {};
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    document.getElementById('minValue').value = '';
    document.getElementById('maxValue').value = '';
    document.getElementById('customFilter').value = '';
    populateColumnFilters();
    applyFilters();
}

// Show calculated fields modal
function showCalculatedFields() {
    populateCalculatedFieldsList();
    showModal('calculatedFieldsModal');
}

// Populate calculated fields list
function populateCalculatedFieldsList() {
    const fieldsList = document.getElementById('calculatedFieldsList');
    
    if (Object.keys(calculatedFields).length === 0) {
        fieldsList.innerHTML = '<div class="field-item">No calculated fields created yet</div>';
        return;
    }
    
    let fieldsHtml = '';
    Object.entries(calculatedFields).forEach(([name, formula]) => {
        fieldsHtml += `
            <div class="field-item">
                <div>
                    <div class="field-name">${name}</div>
                    <div class="field-formula">${formula}</div>
                </div>
                <button class="btn btn-sm btn-danger" onclick="deleteCalculatedField('${name}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    });
    
    fieldsList.innerHTML = fieldsHtml;
}

// Insert function into formula
function insertFunction(funcName) {
    const formulaTextarea = document.getElementById('calculatedFieldFormula');
    const cursorPos = formulaTextarea.selectionStart;
    const textBefore = formulaTextarea.value.substring(0, cursorPos);
    const textAfter = formulaTextarea.value.substring(cursorPos);
    
    formulaTextarea.value = textBefore + funcName + '()' + textAfter;
    formulaTextarea.focus();
    formulaTextarea.setSelectionRange(cursorPos + funcName.length + 1, cursorPos + funcName.length + 1);
}

// Create calculated field
function createCalculatedField() {
    const fieldName = document.getElementById('calculatedFieldName').value;
    const formula = document.getElementById('calculatedFieldFormula').value;
    
    if (!fieldName || !formula) {
        alert('Please enter both field name and formula');
        return;
    }
    
    calculatedFields[fieldName] = formula;
    
    // Clear form
    document.getElementById('calculatedFieldName').value = '';
    document.getElementById('calculatedFieldFormula').value = '';
    
    // Update the data with calculated field
    updateDataWithCalculatedFields();
    
    // Refresh UI
    populateCalculatedFieldsList();
    populateChartOptions();
    updateDashboardMetrics();
}

// Update data with calculated fields
function updateDataWithCalculatedFields() {
    if (Object.keys(calculatedFields).length === 0) return;
    
    currentData.forEach(row => {
        Object.entries(calculatedFields).forEach(([fieldName, formula]) => {
            try {
                // Simple formula evaluation (in a real implementation, you'd use a proper expression parser)
                row[fieldName] = evaluateFormula(formula, row);
            } catch (error) {
                row[fieldName] = 'Error';
            }
        });
    });
}

// Evaluate formula (simplified implementation)
function evaluateFormula(formula, row) {
    // This is a simplified implementation
    // In a real application, you'd use a proper expression parser
    if (formula.includes('SUM(')) {
        const column = formula.match(/SUM\(([^)]+)\)/)[1];
        return row[column] || 0;
    }
    if (formula.includes('AVERAGE(')) {
        const column = formula.match(/AVERAGE\(([^)]+)\)/)[1];
        return row[column] || 0;
    }
    return formula; // Return as-is for now
}

// Delete calculated field
function deleteCalculatedField(fieldName) {
    delete calculatedFields[fieldName];
    populateCalculatedFieldsList();
    updateDashboardMetrics();
}

// Show chart settings modal
function showChartSettings() {
    showModal('chartSettingsModal');
}

// Update chart title
function updateChartTitle() {
    const title = document.getElementById('chartTitleInput').value;
    if (title) {
        document.getElementById('chartTitle').textContent = title;
    }
}

// Update chart theme
function updateChartTheme() {
    const theme = document.getElementById('chartTheme').value;
    chartSettings.theme = theme;
    // Apply theme changes
}

// Update chart colors
function updateChartColors() {
    const colors = document.getElementById('chartColors').value;
    chartSettings.colorPalette = colors;
    // Apply color changes
}

// Update chart grid
function updateChartGrid() {
    chartSettings.showGrid = document.getElementById('showGrid').checked;
    // Apply grid changes
}

// Update chart labels
function updateChartLabels() {
    chartSettings.showLabels = document.getElementById('showLabels').checked;
    // Apply label changes
}

// Update chart label rotation
function updateChartLabelRotation() {
    chartSettings.rotateLabels = document.getElementById('rotateLabels').checked;
    // Apply rotation changes
}

// Update chart tooltips
function updateChartTooltips() {
    chartSettings.enableTooltips = document.getElementById('enableTooltips').checked;
    // Apply tooltip changes
}

// Update chart animations
function updateChartAnimations() {
    chartSettings.enableAnimations = document.getElementById('enableAnimations').checked;
    // Apply animation changes
}

// Update chart drill-down
function updateChartDrilldown() {
    chartSettings.enableDrilldown = document.getElementById('enableDrilldown').checked;
    // Apply drill-down changes
}

// Apply chart settings
function applyChartSettings() {
    // Apply all settings
    updateChart();
    closeModal('chartSettingsModal');
}

// Drill down functionality
function drillDown() {
    if (!chartSettings.enableDrilldown) {
        alert('Drill-down is not enabled. Enable it in chart settings first.');
        return;
    }
    
    showModal('drillDownModal');
    populateDrillOptions();
}

// Populate drill options
function populateDrillOptions() {
    if (currentData.length === 0) return;
    
    const headers = Object.keys(currentData[0]);
    const drillOptions = document.getElementById('drillOptions');
    
    let optionsHtml = '';
    headers.forEach(header => {
        const values = currentData.map(row => row[header]).filter(val => val !== '');
        const uniqueValues = [...new Set(values)].slice(0, 5); // Limit to 5 values
        
        optionsHtml += `
            <div class="drill-option" onclick="drillDownTo('${header}')">
                <strong>${header}</strong> (${uniqueValues.length} unique values)
            </div>
        `;
    });
    
    drillOptions.innerHTML = optionsHtml;
}

// Drill down to specific column
function drillDownTo(column) {
    drillDownHistory.push({ column, level: currentDrillLevel });
    currentDrillLevel = column;
    
    // Filter data for drill-down
    const drillData = currentData.filter(row => row[column] !== '');
    
    // Update drill-down chart
    updateDrillChart(drillData, column);
    
    // Update drill path
    updateDrillPath();
}

// Update drill chart
function updateDrillChart(data, column) {
    const drillChartArea = document.getElementById('drillChartArea');
    
    if (data.length === 0) {
        drillChartArea.innerHTML = '<div class="chart-placeholder"><p>No data available for drill-down</p></div>';
        return;
    }
    
    // Create a simple bar chart for drill-down
    const valueCounts = {};
    data.forEach(row => {
        const value = row[column];
        valueCounts[value] = (valueCounts[value] || 0) + 1;
    });
    
    const chartData = Object.entries(valueCounts).map(([label, value]) => ({ x: label, y: value }));
    const chartHtml = generateChartHtml('bar', chartData, column, 'Count');
    
    drillChartArea.innerHTML = chartHtml;
}

// Update drill path
function updateDrillPath() {
    const drillPath = document.getElementById('drillPath');
    const currentLevel = document.getElementById('currentDrillLevel');
    
    currentLevel.textContent = currentDrillLevel;
    
    let pathHtml = 'Main';
    drillDownHistory.forEach(step => {
        pathHtml += ` > ${step.column}`;
    });
    
    drillPath.innerHTML = pathHtml;
}

// Drill up
function drillUp() {
    if (drillDownHistory.length === 0) {
        alert('Already at the top level');
        return;
    }
    
    const lastStep = drillDownHistory.pop();
    currentDrillLevel = lastStep.level;
    
    if (drillDownHistory.length === 0) {
        currentDrillLevel = 'main';
        document.getElementById('drillChartArea').innerHTML = '<div class="chart-placeholder"><p>Select a drill-down option</p></div>';
    } else {
        const lastDrillStep = drillDownHistory[drillDownHistory.length - 1];
        updateDrillChart(currentData, lastDrillStep.column);
    }
    
    updateDrillPath();
}

// Export drill data
function exportDrillData() {
    const drillChartArea = document.getElementById('drillChartArea');
    if (drillChartArea.innerHTML.includes('chart-placeholder')) {
        alert('No drill-down data to export');
        return;
    }
    
    // Export current drill-down data
    alert('Drill-down data export functionality will be implemented in the next update.');
}

// Create mini chart
function createMiniChart(type) {
    const chartArea = document.getElementById(type + 'Chart');
    
    if (currentData.length === 0) {
        chartArea.innerHTML = '<div class="chart-placeholder"><p>No data available</p></div>';
        return;
    }
    
    const headers = Object.keys(currentData[0]);
    const numericColumns = headers.filter(col => {
        const values = currentData.map(row => row[col]).filter(val => val !== '');
        const numericValues = values.map(v => parseFloat(v)).filter(v => !isNaN(v));
        return numericValues.length > values.length * 0.8;
    });
    
    let chartData = [];
    let xAxis = '';
    let yAxis = '';
    
    switch (type) {
        case 'trend':
            if (numericColumns.length > 0) {
                xAxis = 'Index';
                yAxis = numericColumns[0];
                chartData = currentData.map((row, index) => ({
                    x: index,
                    y: parseFloat(row[yAxis]) || 0
                }));
            }
            break;
        case 'distribution':
            const categoricalColumns = headers.filter(col => {
                const values = currentData.map(row => row[col]).filter(val => val !== '');
                const uniqueValues = [...new Set(values)];
                return uniqueValues.length < Math.min(20, values.length * 0.5);
            });
            if (categoricalColumns.length > 0) {
                xAxis = categoricalColumns[0];
                yAxis = 'Count';
                const valueCounts = {};
                currentData.forEach(row => {
                    const value = row[xAxis];
                    valueCounts[value] = (valueCounts[value] || 0) + 1;
                });
                chartData = Object.entries(valueCounts).map(([label, value]) => ({ x: label, y: value }));
            }
            break;
        case 'correlation':
            if (numericColumns.length > 1) {
                xAxis = numericColumns[0];
                yAxis = numericColumns[1];
                chartData = currentData.map(row => ({
                    x: parseFloat(row[xAxis]) || 0,
                    y: parseFloat(row[yAxis]) || 0
                }));
            }
            break;
    }
    
    if (chartData.length > 0) {
        const chartHtml = generateChartHtml(type === 'correlation' ? 'scatter' : 'bar', chartData, xAxis, yAxis);
        chartArea.innerHTML = chartHtml;
    } else {
        chartArea.innerHTML = '<div class="chart-placeholder"><p>No suitable data for this chart type</p></div>';
    }
}

// Enhanced initialize dashboard function
function initializeDashboard() {
    console.log('initializeDashboard called');
    console.log('Current data length:', currentData.length);
    
    const elements = checkDashboardElements();
    
    if (!elements.dashboardTab) {
        console.error('Dashboard tab not found');
        return;
    }
    
    if (currentData.length === 0) {
        console.log('No data available for dashboard initialization');
        return;
    }
    
    try {
        console.log('Starting dashboard initialization...');
        
        // Initialize all dashboard components
        updateDashboardMetrics();
        generateDataInsights();
        populateChartOptions();
        generateQuickCharts();
        updateAdvancedAnalytics();
        
        console.log('Dashboard initialization completed successfully');
        
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        
        // Try to recover by checking if elements are available
        setTimeout(() => {
            try {
                console.log('Retrying dashboard initialization...');
                const retryElements = checkDashboardElements();
                
                if (retryElements.xAxis && retryElements.yAxis && retryElements.colorBy) {
                    populateChartOptions();
                    console.log('Chart options populated on retry');
                } else {
                    console.error('Dashboard elements still not available on retry');
                }
            } catch (retryError) {
                console.error('Dashboard initialization retry failed:', retryError);
            }
        }, 1000);
    }
}

// Check if dashboard DOM elements are ready
function checkDashboardElements() {
    const elements = {
        xAxis: document.getElementById('xAxis'),
        yAxis: document.getElementById('yAxis'),
        colorBy: document.getElementById('colorBy'),
        chartArea: document.getElementById('chartArea'),
        dashboardTab: document.getElementById('dashboardTab')
    };
    
    console.log('Dashboard elements check:', {
        xAxis: !!elements.xAxis,
        yAxis: !!elements.yAxis,
        colorBy: !!elements.colorBy,
        chartArea: !!elements.chartArea,
        dashboardTab: !!elements.dashboardTab
    });
    
    return elements;
}

// Enhanced refresh chart options function
function refreshChartOptions() {
    console.log('refreshChartOptions called');
    
    const elements = checkDashboardElements();
    
    if (!elements.xAxis || !elements.yAxis || !elements.colorBy) {
        console.error('Dashboard elements not found, cannot refresh chart options');
        return;
    }
    
    if (currentData.length === 0) {
        console.log('No data available for chart options');
        return;
    }
    
    console.log('Refreshing chart options with data length:', currentData.length);
    populateChartOptions();
}

// Generate data insights
function generateDataInsights() {
    console.log('generateDataInsights called');
    
    if (currentData.length === 0) {
        console.log('No data available for insights');
        return;
    }
    
    try {
        const headers = Object.keys(currentData[0]);
        const insights = [];
        
        // Basic data insights
        insights.push(`Dataset contains ${currentData.length} records with ${headers.length} columns.`);
        
        // Numeric columns analysis
        const numericColumns = headers.filter(col => {
            const values = currentData.map(row => row[col]).filter(val => val !== '');
            const numericValues = values.map(v => parseFloat(v)).filter(v => !isNaN(v));
            return numericValues.length > values.length * 0.8;
        });
        
        if (numericColumns.length > 0) {
            insights.push(`Found ${numericColumns.length} numeric columns: ${numericColumns.join(', ')}.`);
        }
        
        // Categorical columns analysis
        const categoricalColumns = headers.filter(col => {
            const values = currentData.map(row => row[col]).filter(val => val !== '');
            const uniqueValues = [...new Set(values)];
            return uniqueValues.length < Math.min(20, values.length * 0.5);
        });
        
        if (categoricalColumns.length > 0) {
            insights.push(`Found ${categoricalColumns.length} categorical columns: ${categoricalColumns.join(', ')}.`);
        }
        
        // Missing data analysis
        const missingData = headers.map(col => {
            const missingCount = currentData.filter(row => !row[col] || row[col].trim() === '').length;
            return { column: col, missing: missingCount, percentage: (missingCount / currentData.length) * 100 };
        }).filter(item => item.missing > 0);
        
        if (missingData.length > 0) {
            const highMissing = missingData.filter(item => item.percentage > 10);
            if (highMissing.length > 0) {
                insights.push(`Warning: ${highMissing.length} columns have more than 10% missing data.`);
            }
        }
        
        console.log('Data insights generated:', insights);
        
        // Update insights panel if it exists
        const insightsPanel = document.querySelector('.insights-content');
        if (insightsPanel) {
            insightsPanel.innerHTML = insights.map(insight => 
                `<div class="insight-item"><i class="fas fa-info-circle"></i> ${insight}</div>`
            ).join('');
        }
        
    } catch (error) {
        console.error('Error generating data insights:', error);
    }
}

// Create chart function
function createChart() {
    console.log('=== createChart called ===');
    
    try {
    const chartType = document.getElementById('chartType').value;
    const xAxis = document.getElementById('xAxis').value;
    const yAxis = document.getElementById('yAxis').value;
    
    console.log('Chart parameters:', { chartType, xAxis, yAxis });
    console.log('Current data length:', currentData.length);
    
    if (!chartType || !xAxis || !yAxis) {
        console.error('Missing chart parameters:', { chartType, xAxis, yAxis });
        alert('Please select chart type, X-axis, and Y-axis.');
        return;
    }
    
    if (currentData.length === 0) {
        console.error('No data available for chart creation');
        alert('No data available for chart creation.');
        return;
    }
    
        console.log('Preparing chart data...');
        const chartData = prepareChartData(chartType, xAxis, yAxis);
        console.log('Chart data prepared:', chartData);
        console.log('Chart data length:', chartData.length);
        
        if (chartData.length === 0) {
            console.error('No data available for the selected chart configuration');
            alert('No data available for the selected chart configuration.');
            return;
        }
        
        console.log('Generating chart HTML...');
        const chartHtml = generateChartHtml(chartType, chartData, xAxis, yAxis);
        console.log('Chart HTML generated, length:', chartHtml.length);
        
        const chartArea = document.getElementById('chartArea');
        if (chartArea) {
            console.log('Chart area found, rendering chart...');
            chartArea.innerHTML = chartHtml;
            console.log('Chart rendered successfully');
        } else {
            console.error('Chart area not found');
            alert('Chart area not found. Please refresh the page.');
        }
        
    } catch (error) {
        console.error('Error creating chart:', error);
        console.error('Error stack:', error.stack);
        alert(`Error creating chart: ${error.message}`);
    }
}

// Update chart function
function updateChart() {
    console.log('updateChart called');
    createChart();
}

// Prepare chart data
function prepareChartData(chartType, xAxis, yAxis) {
    console.log('=== prepareChartData called ===');
    console.log('Parameters:', { chartType, xAxis, yAxis });
    console.log('Current data length:', currentData.length);
    
    if (currentData.length === 0) {
        console.log('No data available for chart preparation');
        return [];
    }
    
    if (!xAxis) {
        console.error('X-axis is required');
        return [];
    }
    
    try {
        console.log('Processing chart type:', chartType);
        
        if (chartType === 'bar' || chartType === 'pie') {
            console.log('Processing bar/pie chart data...');
            
            if (chartType === 'pie') {
                // For pie charts, try to use Y-axis values first, then fall back to counting X-axis
                let pieData = [];
                
                // First attempt: use Y-axis values if they exist and are numeric
                if (yAxis && yAxis !== xAxis) {
                    pieData = currentData
                    .map(row => ({
                        x: row[xAxis] || 'Unknown',
                        y: parseFloat(row[yAxis]) || 0,
                        value: parseFloat(row[yAxis]) || 0,
                        label: row[xAxis] || 'Unknown'
                    }))
                    .filter(item => !isNaN(item.y) && item.y > 0);
                }
                
                // If no valid Y-axis data, count X-axis occurrences
                if (pieData.length === 0) {
                    console.log('Using X-axis count for pie chart data');
                    const counts = {};
                    currentData.forEach(row => {
                        const value = row[xAxis] || 'Unknown';
                        counts[value] = (counts[value] || 0) + 1;
                    });
                    
                    pieData = Object.entries(counts).map(([key, value]) => ({
                        x: key,
                        y: value,
                        value: value,
                        label: key
                    }));
                }
                
                // Sort by value descending for better visualization
                pieData.sort((a, b) => b.value - a.value);
                
                console.log('Pie chart data prepared:', pieData);
                return pieData;
            } else {
                // For bar charts, count occurrences for categorical data
                const counts = {};
                currentData.forEach(row => {
                    const value = row[xAxis] || 'Unknown';
                    counts[value] = (counts[value] || 0) + 1;
                });
                
                const result = Object.entries(counts).map(([key, value]) => ({
                    x: key,
                    y: value,
                    value: value,
                    label: key
                }));
                
                console.log('Bar chart data prepared:', result);
                return result;
            }
        } else if (chartType === 'line' || chartType === 'scatter' || chartType === 'area') {
            console.log('Processing line/scatter/area chart data...');
            // Use numeric data for line/scatter/area charts
            const numericData = currentData
                .map((row, index) => ({
                    x: row[xAxis] || index,
                    y: parseFloat(row[yAxis]) || 0,
                    value: parseFloat(row[yAxis]) || 0
                }))
                .filter(item => !isNaN(item.y));
            
            console.log('Line/scatter/area data prepared:', numericData);
            return numericData;
            
        } else if (chartType === 'histogram') {
            console.log('Processing histogram data...');
            // Create histogram bins
            const values = currentData
                .map(row => parseFloat(row[yAxis]))
                .filter(val => !isNaN(val));
            
            if (values.length === 0) {
                console.log('No numeric values found for histogram');
                return [];
            }
            
            const min = Math.min(...values);
            const max = Math.max(...values);
            const binCount = Math.min(10, Math.ceil(Math.sqrt(values.length)));
            const binSize = (max - min) / binCount;
            
            const bins = {};
            for (let i = 0; i < binCount; i++) {
                const binStart = min + i * binSize;
                const binEnd = min + (i + 1) * binSize;
                const binLabel = `${binStart.toFixed(1)}-${binEnd.toFixed(1)}`;
                bins[binLabel] = 0;
            }
            
            values.forEach(value => {
                const binIndex = Math.floor((value - min) / binSize);
                const binStart = min + binIndex * binSize;
                const binEnd = min + (binIndex + 1) * binSize;
                const binLabel = `${binStart.toFixed(1)}-${binEnd.toFixed(1)}`;
                bins[binLabel]++;
            });
            
            const result = Object.entries(bins).map(([key, value]) => ({
                x: key,
                y: value,
                value: value
            }));
            
            console.log('Histogram data prepared:', result);
            return result;
            
        } else if (chartType === 'heatmap') {
            console.log('Processing heatmap data...');
            // Create heatmap data - use x and y axis as grid coordinates
            const xValues = [...new Set(currentData.map(row => row[xAxis]))];
            const yValues = [...new Set(currentData.map(row => row[yAxis]))];
            
            const heatmapData = [];
            xValues.forEach((xVal, xIndex) => {
                yValues.forEach((yVal, yIndex) => {
                    const count = currentData.filter(row => 
                        row[xAxis] === xVal && row[yAxis] === yVal
                    ).length;
                    if (count > 0) {
                        heatmapData.push({
                            x: xVal,
                            y: yVal,
                            value: count,
                            xIndex: xIndex,
                            yIndex: yIndex
                        });
                    }
                });
            });
            
            console.log('Heatmap data prepared:', heatmapData);
            return heatmapData;
            
        } else if (chartType === 'boxplot') {
            console.log('Processing boxplot data...');
            // Create box plot data - group by x-axis and calculate statistics for y-axis
            const groups = {};
            currentData.forEach(row => {
                const group = row[xAxis] || 'Unknown';
                const value = parseFloat(row[yAxis]);
                if (!isNaN(value)) {
                    if (!groups[group]) groups[group] = [];
                    groups[group].push(value);
                }
            });
            
            const result = Object.entries(groups).map(([group, values]) => {
                values.sort((a, b) => a - b);
                const q1 = values[Math.floor(values.length * 0.25)];
                const q2 = values[Math.floor(values.length * 0.5)];
                const q3 = values[Math.floor(values.length * 0.75)];
                const min = values[0];
                const max = values[values.length - 1];
                
                return {
                    x: group,
                    y: q2, // median
                    value: q2,
                    min: min,
                    max: max,
                    q1: q1,
                    q3: q3,
                    count: values.length
                };
            });
            
            console.log('Boxplot data prepared:', result);
            return result;
            
        } else if (chartType === 'funnel') {
            console.log('Processing funnel data...');
            // Create funnel data - use x-axis as stages, y-axis as values
            const funnelData = currentData
                .map(row => ({
                    x: row[xAxis] || 'Unknown',
                    y: parseFloat(row[yAxis]) || 0,
                    value: parseFloat(row[yAxis]) || 0
                }))
                .filter(item => !isNaN(item.y))
                .sort((a, b) => b.y - a.y); // Sort by value descending
            
            console.log('Funnel data prepared:', funnelData);
            return funnelData;
            
        } else if (chartType === 'radar') {
            console.log('Processing radar data...');
            // Create radar data - use x-axis as categories, y-axis as values
            const radarData = currentData
                .map(row => ({
                    x: row[xAxis] || 'Unknown',
                    y: parseFloat(row[yAxis]) || 0,
                    value: parseFloat(row[yAxis]) || 0
                }))
                .filter(item => !isNaN(item.y));
            
            console.log('Radar data prepared:', radarData);
            return radarData;
        }
        
        console.log('Unknown chart type:', chartType);
        return [];
        
    } catch (error) {
        console.error('Error preparing chart data:', error);
        console.error('Error stack:', error.stack);
        return [];
    }
}

// Test backend connection
async function testBackendConnection() {
    console.log('Testing backend connection...');
    
    try {
        const response = await fetch('/api/health');
        const data = await response.json();
        
        if (response.ok) {
            console.log('Backend connection successful:', data);
            return true;
        } else {
            console.error('Backend connection failed:', data);
            return false;
        }
    } catch (error) {
        console.error('Backend connection error:', error);
        return false;
    }
}

// Enhanced error reporting
function reportError(context, error) {
    console.error(`Error in ${context}:`, error);
    
    // Show user-friendly error message
    const errorMessage = `Error in ${context}: ${error.message || error}`;
    alert(errorMessage);
}

// Debug pie chart function
function debugPieChart() {
    console.log('=== DEBUG PIE CHART ===');
    
    const chartType = document.getElementById('chartType').value;
    const xAxis = document.getElementById('xAxis').value;
    const yAxis = document.getElementById('yAxis').value;
    
    console.log('Current selections:', { chartType, xAxis, yAxis });
    console.log('Current data length:', currentData.length);
    
    if (currentData.length > 0) {
        console.log('Sample data row:', currentData[0]);
        console.log('Available columns:', Object.keys(currentData[0]));
    }
    
    if (chartType === 'pie' && xAxis && yAxis) {
        console.log('Testing pie chart data preparation...');
        
        try {
            const chartData = prepareChartData('pie', xAxis, yAxis);
            console.log('Pie chart data prepared:', chartData);
            
            if (chartData.length > 0) {
                console.log('Testing pie chart HTML generation...');
                const chartHtml = generateChartHtml('pie', chartData, xAxis, yAxis);
                console.log('Pie chart HTML generated, length:', chartHtml.length);
                console.log('Pie chart HTML preview:', chartHtml.substring(0, 500) + '...');
                
                // Test rendering
                const chartArea = document.getElementById('chartArea');
                if (chartArea) {
                    chartArea.innerHTML = chartHtml;
                    console.log('Pie chart rendered for debugging');
                }
            } else {
                console.error('No data returned from prepareChartData for pie chart');
            }
        } catch (error) {
            console.error('Error in pie chart debugging:', error);
            console.error('Error stack:', error.stack);
        }
    } else {
        console.log('Please select pie chart type and both X and Y axes');
    }
}

function undoEdit() {
    if (undoStack.length > 0) {
        const lastEdit = undoStack.pop();
        redoStack.push({
            rowIndex: lastEdit.rowIndex,
            colIndex: lastEdit.colIndex,
            oldValue: currentData[lastEdit.rowIndex][lastEdit.colIndex],
            newValue: lastEdit.oldValue
        });
        
        currentData[lastEdit.rowIndex][lastEdit.colIndex] = lastEdit.oldValue;
        filteredData = [...currentData];
        populateTable();
        console.log('Undo applied');
    } else {
        alert('Nothing to undo');
    }
}

function redoEdit() {
    if (redoStack.length > 0) {
        const lastRedo = redoStack.pop();
        undoStack.push({
            rowIndex: lastRedo.rowIndex,
            colIndex: lastRedo.colIndex,
            oldValue: currentData[lastRedo.rowIndex][lastRedo.colIndex],
            newValue: lastRedo.newValue
        });
        
        currentData[lastRedo.rowIndex][lastRedo.colIndex] = lastRedo.newValue;
        filteredData = [...currentData];
        populateTable();
        console.log('Redo applied');
    } else {
        alert('Nothing to redo');
    }
}

function clearSelection() {
    selectedCells.clear();
    selectionStart = null;
    highlightSelectedCells();
}

function highlightSelectedCells() {
    const tableBody = document.getElementById('tableBody');
    if (!tableBody) return;
    Array.from(tableBody.querySelectorAll('td')).forEach(td => {
        td.classList.remove('selected-cell');
    });
    selectedCells.forEach(cellId => {
        const td = document.getElementById(cellId);
        if (td) td.classList.add('selected-cell');
    });
}

function cellId(row, col) {
    return `cell-${row}-${col}`;
}

function handleCellMouseDown(row, col) {
    clearSelection();
    selectionStart = { row, col };
    selectedCells.add(cellId(row, col));
    highlightSelectedCells();
}

function handleCellMouseOver(row, col) {
    if (selectionStart) {
        clearSelection();
        const minRow = Math.min(selectionStart.row, row);
        const maxRow = Math.max(selectionStart.row, row);
        const minCol = Math.min(selectionStart.col, col);
        const maxCol = Math.max(selectionStart.col, col);
        for (let r = minRow; r <= maxRow; r++) {
            for (let c = minCol; c <= maxCol; c++) {
                selectedCells.add(cellId(r, c));
            }
        }
        highlightSelectedCells();
    }
}

function handleCellMouseUp() {
    selectionStart = null;
}

// Copy selected cells to clipboard
function handleCopy(e) {
    if (selectedCells.size === 0) return;
    e.preventDefault();
    const tableBody = document.getElementById('tableBody');
    const rows = Array.from(tableBody.querySelectorAll('tr'));
    let minRow = Infinity, maxRow = -1, minCol = Infinity, maxCol = -1;
    selectedCells.forEach(cell => {
        const [_, r, c] = cell.split('-').map(Number);
        minRow = Math.min(minRow, r);
        maxRow = Math.max(maxRow, r);
        minCol = Math.min(minCol, c);
        maxCol = Math.max(maxCol, c);
    });
    let clipboard = '';
    for (let r = minRow; r <= maxRow; r++) {
        let rowVals = [];
        for (let c = minCol; c <= maxCol; c++) {
            const cell = document.getElementById(cellId(r, c));
            rowVals.push(cell ? cell.querySelector('input').value : '');
        }
        clipboard += rowVals.join('\t') + '\n';
    }
    e.clipboardData.setData('text/plain', clipboard.trim());
}

// Paste clipboard data into selected cells
function handlePaste(e) {
    if (selectedCells.size === 0) return;
    e.preventDefault();
    const clipboard = e.clipboardData.getData('text/plain');
    const rows = clipboard.split(/\r?\n/);
    const firstCell = Array.from(selectedCells)[0];
    const [_, startRow, startCol] = firstCell.split('-').map(Number);
    rows.forEach((row, rIdx) => {
        const vals = row.split(/\t/);
        vals.forEach((val, cIdx) => {
            const r = startRow + rIdx;
            const c = startCol + cIdx;
            if (currentData[r] && Object.keys(currentData[r])[c] !== undefined) {
                const header = Object.keys(currentData[r])[c];
                currentData[r][header] = val;
                filteredData[r][header] = val;
            }
        });
    });
    populateTable();
}

document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 'c') handleCopy(e);
    if (e.ctrlKey && e.key === 'v') handlePaste(e);
});

function makeHeadersResizable() {
    const headers = document.querySelectorAll('#tableHeaders th');
    headers.forEach((header, index) => {
        const resizer = document.createElement('div');
        resizer.className = 'column-resizer';
        resizer.style.position = 'absolute';
        resizer.style.right = '0';
        resizer.style.top = '0';
        resizer.style.width = '5px';
        resizer.style.height = '100%';
        resizer.style.cursor = 'col-resize';
        resizer.style.backgroundColor = 'transparent';
        
        resizer.onmousedown = (e) => {
            e.preventDefault();
            isResizing = true;
            currentResizeColumn = index;
            document.body.style.cursor = 'col-resize';
        };
        
        header.style.position = 'relative';
        header.appendChild(resizer);
        
        // Make headers draggable for reordering
        header.draggable = true;
        header.ondragstart = (e) => {
            isDragging = true;
            draggedColumn = index;
            e.dataTransfer.setData('text/plain', index);
        };
        
        header.ondragover = (e) => e.preventDefault();
        header.ondrop = (e) => {
            e.preventDefault();
            const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
            const toIndex = index;
            if (fromIndex !== toIndex) {
                reorderColumn(fromIndex, toIndex);
            }
        };
    });
}

function reorderColumn(fromIndex, toIndex) {
    const headers = Object.keys(currentData[0]);
    const newHeaders = [...headers];
    const movedHeader = newHeaders.splice(fromIndex, 1)[0];
    newHeaders.splice(toIndex, 0, movedHeader);
    
    currentData = currentData.map(row => {
        const newRow = {};
        newHeaders.forEach(header => {
            newRow[header] = row[header];
        });
        return newRow;
    });
    
    filteredData = JSON.parse(JSON.stringify(currentData));
    populateTable();
}

function toggleFreezeHeader() {
    const table = document.getElementById('dataTable');
    if (table) {
        table.classList.toggle('frozen-header');
        console.log('Header freeze toggled');
    }
}

// Enhanced mouse move handler for column resizing with visual guide
document.addEventListener('mousemove', (e) => {
    if (isResizing && currentResizeColumn !== null) {
        const headers = document.querySelectorAll('#tableHeader th');
        const header = headers[currentResizeColumn];
        const resizer = header.querySelector('.column-resizer');
        const rect = header.getBoundingClientRect();
        const newWidth = e.clientX - rect.left;
        
        // Update resize guide position
        if (resizer && resizer.resizeGuide) {
            resizer.resizeGuide.style.left = e.clientX + 'px';
        }
        
        // Apply width constraints - allow any size but with reasonable limits
        const minWidth = 20; // Much smaller minimum
        const maxWidth = 800; // Larger maximum
        const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
        
        if (constrainedWidth >= minWidth) {
            header.style.width = constrainedWidth + 'px';
            header.style.minWidth = constrainedWidth + 'px';
            
            // Update all cells in this column
            const cells = document.querySelectorAll(`td:nth-child(${currentResizeColumn + 1})`);
            cells.forEach(cell => {
                cell.style.width = constrainedWidth + 'px';
                cell.style.minWidth = constrainedWidth + 'px';
            });
            
            // Show width indicator
            showWidthIndicator(constrainedWidth);
        }
    }
});

document.addEventListener('mouseup', () => {
    if (isResizing) {
        isResizing = false;
        currentResizeColumn = null;
        document.body.style.cursor = 'default';
        
        // Remove resize guide
        const guides = document.querySelectorAll('.resize-guide');
        guides.forEach(guide => guide.remove());
        
        // Remove border from header
        const headers = document.querySelectorAll('#tableHeader th');
        headers.forEach(header => {
            header.style.borderRight = '';
            const resizer = header.querySelector('.column-resizer');
            if (resizer) {
                resizer.style.backgroundColor = 'transparent';
            }
        });
        
        // Hide width indicator
        hideWidthIndicator();
    }
    if (isDragging) {
        isDragging = false;
        draggedColumn = null;
    }
});

function showFindReplace() {
    if (currentData.length === 0) {
        alert('Please load data first.');
        return;
    }
    showModal('findReplaceModal');
}

function findText() {
    const findValue = document.getElementById('findText').value;
    const matchCase = document.getElementById('matchCase').checked;
    const matchWholeWord = document.getElementById('matchWholeWord').checked;
    
    if (!findValue) return;
    
    clearSelection();
    const searchRegex = new RegExp(
        matchWholeWord ? `\\b${findValue}\\b` : findValue,
        matchCase ? 'g' : 'gi'
    );
    
    let found = false;
    currentData.forEach((row, rowIndex) => {
        Object.keys(row).forEach((header, colIndex) => {
            const cellValue = row[header] || '';
            if (searchRegex.test(cellValue)) {
                selectedCells.add(cellId(rowIndex, colIndex));
                found = true;
            }
        });
    });
    
    if (found) {
        highlightSelectedCells();
        alert(`Found ${selectedCells.size} matches`);
    } else {
        alert('No matches found');
    }
}

function replaceText() {
    const findValue = document.getElementById('findText').value;
    const replaceValue = document.getElementById('replaceText').value;
    const matchCase = document.getElementById('matchCase').checked;
    const matchWholeWord = document.getElementById('matchWholeWord').checked;
    
    if (!findValue || selectedCells.size === 0) return;
    
    const searchRegex = new RegExp(
        matchWholeWord ? `\\b${findValue}\\b` : findValue,
        matchCase ? 'g' : 'gi'
    );
    
    let replaced = 0;
    selectedCells.forEach(cellId => {
        const [_, rowIndex, colIndex] = cellId.split('-').map(Number);
        const header = Object.keys(currentData[rowIndex])[colIndex];
        const oldValue = currentData[rowIndex][header] || '';
        const newValue = oldValue.replace(searchRegex, replaceValue);
        
        if (oldValue !== newValue) {
            currentData[rowIndex][header] = newValue;
            filteredData[rowIndex][header] = newValue;
            replaced++;
        }
    });
    
    populateTable();
    alert(`Replaced ${replaced} occurrences`);
}

function replaceAll() {
    const findValue = document.getElementById('findText').value;
    const replaceValue = document.getElementById('replaceText').value;
    const matchCase = document.getElementById('matchCase').checked;
    const matchWholeWord = document.getElementById('matchWholeWord').checked;
    
    if (!findValue) return;
    
    const searchRegex = new RegExp(
        matchWholeWord ? `\\b${findValue}\\b` : findValue,
        matchCase ? 'g' : 'gi'
    );
    
    let replaced = 0;
    currentData.forEach((row, rowIndex) => {
        Object.keys(row).forEach(header => {
            const oldValue = row[header] || '';
            const newValue = oldValue.replace(searchRegex, replaceValue);
            
            if (oldValue !== newValue) {
                currentData[rowIndex][header] = newValue;
                filteredData[rowIndex][header] = newValue;
                replaced++;
            }
        });
    });
    
    populateTable();
    alert(`Replaced ${replaced} occurrences`);
}

function showConditionalFormatting() {
    if (currentData.length === 0) {
        alert('Please load data first.');
        return;
    }
    
    showModal('conditionalFormattingModal');
    populateFormattingRulesList();
    
    // Populate column dropdown
    const formatColumn = document.getElementById('formatColumn');
    if (formatColumn) {
        formatColumn.innerHTML = '<option value="">Select Column</option>';
        Object.keys(currentData[0]).forEach(column => {
            formatColumn.innerHTML += `<option value="${column}">${column}</option>`;
        });
    }
}

function addConditionalFormat() {
    const column = document.getElementById('formatColumn').value;
    const condition = document.getElementById('formatCondition').value;
    const value = document.getElementById('formatValue').value;
    const color = document.getElementById('formatColor').value;
    
    if (!column || !value) {
        alert('Please select a column and enter a value');
        return;
    }
    
    const rule = { column, condition, value, color };
    conditionalFormattingRules.push(rule);
    
    applyConditionalFormatting();
    populateFormattingRulesList();
    
    console.log('Conditional format rule added:', rule);
}

function applyConditionalFormatting() {
    if (conditionalFormattingRules.length === 0) return;
    
    const table = document.getElementById('dataTable');
    if (!table) return;
    
    // Reset all formatting
    table.querySelectorAll('td').forEach(cell => {
        cell.style.backgroundColor = '';
    });
    
    // Apply rules
    conditionalFormattingRules.forEach(rule => {
        const columnIndex = Object.keys(currentData[0]).indexOf(rule.column);
        if (columnIndex === -1) return;
        
        const cells = table.querySelectorAll(`td:nth-child(${columnIndex + 1})`);
        cells.forEach((cell, rowIndex) => {
            const cellValue = cell.textContent;
            let shouldFormat = false;
            
            switch (rule.condition) {
                case 'equals':
                    shouldFormat = cellValue === rule.value;
                    break;
                case 'contains':
                    shouldFormat = cellValue.includes(rule.value);
                    break;
                case 'greater':
                    shouldFormat = parseFloat(cellValue) > parseFloat(rule.value);
                    break;
                case 'less':
                    shouldFormat = parseFloat(cellValue) < parseFloat(rule.value);
                    break;
            }
            
            if (shouldFormat) {
                    cell.style.backgroundColor = rule.color;
            }
        });
    });
}

function clearConditionalFormatting() {
    conditionalFormattingRules = [];
    document.querySelectorAll('.conditional-format').forEach(el => {
        el.classList.remove('conditional-format');
        el.style.backgroundColor = '';
        el.style.color = '';
    });
}

function showQuickStats() {
    if (currentData.length === 0) {
        alert('Please load data first.');
        return;
    }
    
    showModal('quickStatsModal');
    populateQuickStats();
}

function showFormulaHelp() {
    showModal('formulaHelpModal');
}

// Missing functions for Chart operations
function exportChart() {
    const chartArea = document.getElementById('chartArea');
    if (!chartArea || chartArea.innerHTML.trim() === '') {
        alert('No chart to export');
        return;
    }
    
    // Create a canvas to capture the chart
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 800;
    canvas.height = 600;
    
    // Convert SVG to canvas (simplified approach)
    const svg = chartArea.querySelector('svg');
    if (svg) {
        const svgData = new XMLSerializer().serializeToString(svg);
        const img = new Image();
        img.onload = function() {
            ctx.drawImage(img, 0, 0);
            canvas.toBlob(function(blob) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'chart.png';
                a.click();
                URL.revokeObjectURL(url);
            });
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    } else {
        alert('Chart export not available for this chart type');
    }
}

function fullscreenChart() {
    const chartArea = document.getElementById('chartArea');
    if (!chartArea || chartArea.innerHTML.trim() === '') {
        alert('No chart to display in fullscreen');
        return;
    }
    
    showModal('fullscreenChartModal');
    // Create modal if it doesn't exist
    if (!document.getElementById('fullscreenChartModal')) {
    const modal = document.createElement('div');
        modal.id = 'fullscreenChartModal';
        modal.className = 'modal fullscreen-modal';
    modal.innerHTML = `
            <div class="modal-content fullscreen-content">
                <div class="fullscreen-header">
                    <h3>Chart Fullscreen View</h3>
                    <button class="btn btn-secondary" onclick="closeModal('fullscreenChartModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div id="fullscreenChartArea" class="fullscreen-chart-area"></div>
        </div>
    `;
    document.body.appendChild(modal);
    }
    
    // Copy chart content to fullscreen
    const fullscreenArea = document.getElementById('fullscreenChartArea');
    if (fullscreenArea) {
        fullscreenArea.innerHTML = chartArea.innerHTML;
    }
}

function refreshChart() {
    console.log('Refreshing chart...');
    updateChart();
}

function drillDown() {
    if (currentData.length === 0) {
        alert('No data available for drill-down');
        return;
    }
    
    showModal('drillDownModal');
    populateDrillOptions();
}

function drillUp() {
    if (drillDownHistory.length > 0) {
        const lastDrill = drillDownHistory.pop();
        currentDrillLevel = lastDrill.level;
        
        if (drillDownHistory.length === 0) {
            // Back to main level
            updateChart();
        } else {
            // Back to previous drill level
            const previousDrill = drillDownHistory[drillDownHistory.length - 1];
            drillDownTo(previousDrill.column);
        }
        
        updateDrillPath();
    } else {
        alert('Already at the top level');
    }
}

function exportDrillData() {
    if (currentData.length === 0) {
        alert('No data to export');
        return;
    }
    
    // Export current drill-down data
    const headers = Object.keys(currentData[0]);
    let csvData = headers.join(',') + '\n';
    
    currentData.forEach(row => {
        const values = headers.map(header => {
            const value = row[header] || '';
            return `"${value}"`;
        });
        csvData += values.join(',') + '\n';
    });
    
    downloadFile(csvData, 'drill_down_data.csv', 'text/csv');
}

function createMiniChart(type) {
    console.log('Creating mini chart:', type);
    
    let chartData = [];
    let chartType = 'bar';
    
    switch (type) {
        case 'trend':
            chartType = 'line';
            // Create trend data
            if (currentData.length > 0) {
                const numericColumns = Object.keys(currentData[0]).filter(col => 
                    !isNaN(currentData[0][col]) && currentData[0][col] !== ''
                );
                if (numericColumns.length > 0) {
                    const col = numericColumns[0];
                    chartData = currentData.slice(0, 10).map((row, i) => ({
                        x: `Row ${i + 1}`,
                        y: parseFloat(row[col]) || 0
                    }));
                }
            }
            break;
            
        case 'distribution':
            chartType = 'pie';
            // Create distribution data
            if (currentData.length > 0) {
                const categoricalColumns = Object.keys(currentData[0]).filter(col => 
                    isNaN(currentData[0][col]) || currentData[0][col] === ''
                );
                if (categoricalColumns.length > 0) {
                    const col = categoricalColumns[0];
                    const counts = {};
                    currentData.forEach(row => {
                        const value = row[col] || 'Empty';
                        counts[value] = (counts[value] || 0) + 1;
                    });
                    chartData = Object.entries(counts).map(([label, value]) => ({
                        label: label,
                        value: value
                    }));
                }
            }
            break;
            
        case 'correlation':
            chartType = 'scatter';
            // Create correlation data
            if (currentData.length > 0) {
                const numericColumns = Object.keys(currentData[0]).filter(col => 
                    !isNaN(currentData[0][col]) && currentData[0][col] !== ''
                );
                if (numericColumns.length >= 2) {
                    const col1 = numericColumns[0];
                    const col2 = numericColumns[1];
                    chartData = currentData.slice(0, 20).map(row => ({
                        x: parseFloat(row[col1]) || 0,
                        y: parseFloat(row[col2]) || 0
                    }));
                }
            }
            break;
    }
    
    if (chartData.length > 0) {
        const chartHtml = generateChartHtml(chartType, chartData, 'x', 'y');
        const targetArea = document.getElementById(`${type}Chart`);
        if (targetArea) {
            targetArea.innerHTML = chartHtml;
        }
    } else {
        alert('No suitable data available for this chart type');
    }
}

function initializeDashboard() {
    console.log('=== Initializing Dashboard ===');
    try {
        if (currentData.length === 0) {
            alert('No data available for dashboard initialization');
            return;
        }
        
        updateDashboardMetrics();
        generateDataInsights();
        populateChartOptions();
        generateQuickCharts();
        
        console.log('Dashboard initialization completed successfully');
        alert('Dashboard initialized successfully');
        } catch (error) {
        console.error('Dashboard initialization failed:', error);
        alert('Dashboard initialization failed: ' + error.message);
    }
}

function debugPieChart() {
    console.log('=== Debugging Pie Chart ===');
    
    if (currentData.length === 0) {
        alert('No data available for pie chart debugging');
        return;
    }
    
    // Test pie chart with sample data
    const testData = [
        { label: 'Category A', value: 30 },
        { label: 'Category B', value: 25 },
        { label: 'Category C', value: 45 }
    ];
    
    console.log('Test data:', testData);
    
    try {
        const chartHtml = generateChartHtml('pie', testData, 'label', 'value');
        console.log('Generated chart HTML:', chartHtml);
        
        const chartArea = document.getElementById('chartArea');
        if (chartArea) {
            chartArea.innerHTML = chartHtml;
            console.log('Pie chart displayed successfully');
            alert('Pie chart debug completed - check console for details');
        }
    } catch (error) {
        console.error('Pie chart debug failed:', error);
        alert('Pie chart debug failed: ' + error.message);
    }
}

// Helper functions for the missing functions
function populateQuickStats() {
    const statsContent = document.getElementById('quickStatsContent');
    if (!statsContent || currentData.length === 0) return;
    
    const headers = Object.keys(currentData[0]);
    let statsHtml = '<div class="stats-grid">';
    
    headers.forEach(header => {
        const values = currentData.map(row => row[header]).filter(val => val !== '');
        const numericValues = values.filter(val => !isNaN(val)).map(val => parseFloat(val));
        
        statsHtml += `
            <div class="stat-item">
                <h5>${header}</h5>
                <p>Total: ${values.length}</p>
                <p>Non-empty: ${values.filter(v => v !== '').length}</p>
        `;
        
        if (numericValues.length > 0) {
            const sum = numericValues.reduce((a, b) => a + b, 0);
            const avg = sum / numericValues.length;
            const max = Math.max(...numericValues);
            const min = Math.min(...numericValues);
            
            statsHtml += `
                <p>Sum: ${sum.toFixed(2)}</p>
                <p>Average: ${avg.toFixed(2)}</p>
                <p>Max: ${max}</p>
                <p>Min: ${min}</p>
            `;
        }
        
        statsHtml += '</div>';
    });
    
    statsHtml += '</div>';
    statsContent.innerHTML = statsHtml;
}

function populateFormattingRulesList() {
    const rulesList = document.getElementById('formattingRulesList');
    if (!rulesList) return;
    
    let html = '';
    conditionalFormattingRules.forEach((rule, index) => {
        html += `
            <div class="formatting-rule">
                <span>${rule.column} ${rule.condition} ${rule.value}</span>
                <span class="color-preview" style="background: ${rule.color}"></span>
                <button class="btn btn-sm btn-danger" onclick="removeFormattingRule(${index})">Remove</button>
            </div>
        `;
    });
    
    rulesList.innerHTML = html;
}

function removeFormattingRule(index) {
    conditionalFormattingRules.splice(index, 1);
    applyConditionalFormatting();
    populateFormattingRulesList();
}

// Initialize autosave when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Don't auto-load cached data on page load
    // initializeAutoSave();
    console.log('Auto-save disabled on page load to prevent unwanted data restoration');
    
    // Ensure pagination is hidden when no data is present
    if (currentData.length === 0) {
        const pagination = document.getElementById('pagination');
        const tableInfo = document.querySelector('.table-info');
        if (pagination) pagination.style.display = 'none';
        if (tableInfo) tableInfo.style.display = 'none';
    }
});

// Global function to clear cache (can be called from browser console)
window.clearCache = function() {
    clearAllStorage();
    alert('Cache cleared! Please refresh the page.');
    console.log('Cache cleared successfully. Refresh the page to see changes.');
};

// ===== ADDITIONAL MISSING FUNCTIONS =====

// Find and Replace functions
function findText() {
    const findValue = document.getElementById('findText').value;
    if (!findValue) {
        alert('Please enter text to find');
        return;
    }
    
    const table = document.getElementById('dataTable');
    if (!table) return;
    
    // Clear previous highlights
    table.querySelectorAll('.highlighted').forEach(cell => {
        cell.classList.remove('highlighted');
    });
    
    // Find and highlight matches
    const cells = table.querySelectorAll('td');
    let found = false;
    
    cells.forEach(cell => {
        if (cell.textContent.includes(findValue)) {
            cell.classList.add('highlighted');
            found = true;
        }
    });
    
    if (found) {
        alert(`Found ${table.querySelectorAll('.highlighted').length} matches`);
    } else {
        alert('No matches found');
    }
}

function replaceText() {
    const findValue = document.getElementById('findText').value;
    const replaceValue = document.getElementById('replaceText').value;
    
    if (!findValue) {
        alert('Please enter text to find');
        return;
    }
    
    const table = document.getElementById('dataTable');
    if (!table) return;
    
    const highlightedCells = table.querySelectorAll('.highlighted');
    if (highlightedCells.length === 0) {
        alert('No highlighted cells to replace. Use Find first.');
        return;
    }
    
    // Replace in highlighted cells
    highlightedCells.forEach(cell => {
        const input = cell.querySelector('input');
            if (input) {
            input.value = input.value.replace(findValue, replaceValue);
            // Update data
            const rowIndex = parseInt(cell.getAttribute('data-row'));
            const colIndex = parseInt(cell.getAttribute('data-col'));
            const headers = Object.keys(currentData[0]);
            currentData[rowIndex][headers[colIndex]] = input.value;
        }
    });
    
    filteredData = [...currentData];
    populateTable();
    alert(`Replaced ${highlightedCells.length} occurrences`);
}

function replaceAll() {
    const findValue = document.getElementById('findText').value;
    const replaceValue = document.getElementById('replaceText').value;
    
    if (!findValue) {
        alert('Please enter text to find');
        return;
    }
    
    let replacedCount = 0;
    
    // Replace in all data
    currentData.forEach((row, rowIndex) => {
        Object.keys(row).forEach((header, colIndex) => {
            const oldValue = row[header];
            if (oldValue && oldValue.toString().includes(findValue)) {
                row[header] = oldValue.toString().replace(new RegExp(findValue, 'g'), replaceValue);
                replacedCount++;
            }
        });
    });
    
    filteredData = [...currentData];
    populateTable();
    alert(`Replaced ${replacedCount} occurrences`);
}

// Import/Export functions
function showImportExportMenu() {
    showModal('importExportModal');
    // Create modal if it doesn't exist
    if (!document.getElementById('importExportModal')) {
        const modal = document.createElement('div');
        modal.id = 'importExportModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3><i class="fas fa-exchange-alt"></i> Import/Export Options</h3>
                <div class="import-export-options">
                    <div class="import-section">
                        <h4>Import:</h4>
                        <button class="btn btn-primary" onclick="importXLSX()">
                            <i class="fas fa-file-excel"></i> Import XLSX
                        </button>
                        <button class="btn btn-primary" onclick="importJSON()">
                            <i class="fas fa-file-code"></i> Import JSON
                        </button>
                    </div>
                    <div class="export-section">
                        <h4>Export:</h4>
                        <button class="btn btn-success" onclick="exportToXLSX()">
                            <i class="fas fa-file-excel"></i> Export XLSX
                        </button>
                        <button class="btn btn-success" onclick="exportToJSON()">
                            <i class="fas fa-file-code"></i> Export JSON
                        </button>
                        <button class="btn btn-success" onclick="exportData('csv')">
                            <i class="fas fa-file-csv"></i> Export CSV
                        </button>
                    </div>
                </div>
                <div class="modal-buttons">
                    <button class="btn btn-secondary" onclick="closeModal('importExportModal')">Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
}

function exportToXLSX() {
    if (currentData.length === 0) {
        alert('No data to export');
        return;
    }
    
    // Create XLSX-like CSV with proper formatting
    const headers = Object.keys(currentData[0]);
    let csvData = headers.join(',') + '\n';
    
    currentData.forEach(row => {
        const values = headers.map(header => {
            const value = row[header] || '';
            return `"${value}"`;
        });
        csvData += values.join(',') + '\n';
    });
    
    downloadFile(csvData, 'export.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

function exportToJSON() {
    if (currentData.length === 0) {
        alert('No data to export');
        return;
    }
    
    const jsonData = JSON.stringify(currentData, null, 2);
    downloadFile(jsonData, 'export.json', 'application/json');
}

function importXLSX() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,.csv';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const csv = e.target.result;
                    const data = parseCSV(csv);
                    if (data.length > 0) {
                        currentData = data;
                        filteredData = [...currentData];
                        populateTable();
                        showTableSection();
                        alert('File imported successfully');
                    } else {
                        alert('No data found in file');
                    }
                } catch (error) {
                    alert('Error importing file: ' + error.message);
                }
            };
            reader.readAsText(file);
        }
    };
    input.click();
}

function importJSON() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = JSON.parse(e.target.result);
                    if (Array.isArray(data) && data.length > 0) {
                        currentData = data;
                        filteredData = [...currentData];
                        populateTable();
                        showTableSection();
                        alert('JSON file imported successfully');
                    } else {
                        alert('Invalid JSON data');
                    }
                } catch (error) {
                    alert('Error importing JSON: ' + error.message);
                }
            };
            reader.readAsText(file);
        }
    };
    input.click();
}

// Additional utility functions
function showKeyboardShortcuts() {
    showModal('keyboardShortcutsModal');
    // Create modal if it doesn't exist
    if (!document.getElementById('keyboardShortcutsModal')) {
    const modal = document.createElement('div');
    modal.id = 'keyboardShortcutsModal';
        modal.className = 'modal';
    modal.innerHTML = `
            <div class="modal-content large-modal">
                <h3><i class="fas fa-keyboard"></i> Keyboard Shortcuts</h3>
                <div class="shortcuts-content">
                    <div class="shortcut-section">
                        <h4>File Operations</h4>
                            <ul>
                                <li><kbd>Ctrl</kbd> + <kbd>S</kbd> - Save CSV</li>
                                <li><kbd>Ctrl</kbd> + <kbd>O</kbd> - Import/Export Menu</li>
                                <li><kbd>Ctrl</kbd> + <kbd>N</kbd> - New/Clear Data</li>
                            </ul>
                    </div>
                    <div class="shortcut-section">
                        <h4>Editing</h4>
                            <ul>
                                <li><kbd>Ctrl</kbd> + <kbd>Z</kbd> - Undo</li>
                                <li><kbd>Ctrl</kbd> + <kbd>Y</kbd> - Redo</li>
                                <li><kbd>Delete</kbd> - Clear Selected Cells</li>
                                <li><kbd>Ctrl</kbd> + <kbd>Enter</kbd> - Add New Row</li>
                            </ul>
                        </div>
                    <div class="shortcut-section">
                        <h4>Navigation</h4>
                            <ul>
                                <li><kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd> - Navigate Cells</li>
                                <li><kbd>Tab</kbd> - Next Cell</li>
                                <li><kbd>Shift</kbd> + <kbd>Tab</kbd> - Previous Cell</li>
                            </ul>
                    </div>
                    <div class="shortcut-section">
                        <h4>Search & Tools</h4>
                            <ul>
                                <li><kbd>Ctrl</kbd> + <kbd>F</kbd> - Find/Replace</li>
                                <li><kbd>Ctrl</kbd> + <kbd>C</kbd> - Copy Selected</li>
                                <li><kbd>Ctrl</kbd> + <kbd>V</kbd> - Paste</li>
                            </ul>
                        </div>
                    </div>
                <div class="modal-buttons">
                    <button class="btn btn-secondary" onclick="closeModal('keyboardShortcutsModal')">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    }
}

function showHelp() {
    showModal('helpModal');
    // Create modal if it doesn't exist
    if (!document.getElementById('helpModal')) {
    const modal = document.createElement('div');
    modal.id = 'helpModal';
        modal.className = 'modal';
    modal.innerHTML = `
            <div class="modal-content large-modal">
                <h3><i class="fas fa-question-circle"></i> CSV AI Viewer - Help Guide</h3>
                <div class="help-content">
                    <div class="help-section">
                        <h4>Getting Started</h4>
                            <ol>
                                <li>Upload a CSV file or start with empty data</li>
                                <li>Edit cells by clicking and typing</li>
                                <li>Use formulas starting with = (e.g., =SUM(A1:A10))</li>
                                <li>Select multiple cells by dragging</li>
                                <li>Use Ctrl+C/V for copy/paste</li>
                            </ol>
                    </div>
                    <div class="help-section">
                        <h4>Features</h4>
                            <ul>
                                <li><strong>Multi-cell Selection:</strong> Click and drag to select ranges</li>
                                <li><strong>Formulas:</strong> SUM, AVG, COUNT, MAX, MIN functions</li>
                                <li><strong>Conditional Formatting:</strong> Color cells based on conditions</li>
                                <li><strong>Data Validation:</strong> Restrict input types</li>
                                <li><strong>Find/Replace:</strong> Search and replace text</li>
                                <li><strong>Column Operations:</strong> Resize, reorder, freeze headers</li>
                            </ul>
                        </div>
                    <div class="help-section">
                        <h4>Charts & Visualization</h4>
                        <ul>
                            <li><strong>Multiple Chart Types:</strong> Bar, Line, Pie, Scatter, Area, etc.</li>
                            <li><strong>Interactive Charts:</strong> Hover for details, click to drill down</li>
                            <li><strong>Chart Export:</strong> Save charts as images</li>
                            <li><strong>Dashboard:</strong> Multiple charts and metrics view</li>
                        </ul>
                    </div>
                    <div class="help-section">
                        <h4>Import/Export</h4>
                            <ul>
                                <li>CSV, XLSX, and JSON formats supported</li>
                                <li>Auto-save to browser storage</li>
                                <li>Data recovery on page reload</li>
                            </ul>
                            </div>
                        </div>
                <div class="modal-buttons">
                    <button class="btn btn-secondary" onclick="closeModal('helpModal')">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    }
}

// Dark mode functionality
function toggleDarkMode() {
    const body = document.body;
    const isDark = body.classList.toggle('dark-mode');
    
    // Update button text
    const darkModeBtn = document.getElementById('darkModeBtn');
    if (darkModeBtn) {
        darkModeBtn.innerHTML = isDark ? 
            '<i class="fas fa-sun"></i> Light Mode' : 
            '<i class="fas fa-moon"></i> Dark Mode';
    }
    
    // Save preference
    localStorage.setItem('darkMode', isDark);
}

// Initialize dark mode on page load
function initializeDarkMode() {
    const isDark = localStorage.getItem('darkMode') === 'true';
    if (isDark) {
        document.body.classList.add('dark-mode');
        const darkModeBtn = document.getElementById('darkModeBtn');
        if (darkModeBtn) {
            darkModeBtn.innerHTML = '<i class="fas fa-sun"></i> Light Mode';
        }
    }
}

// Initialize dark mode when page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeDarkMode();
});

function stopApplication() {
    if (confirm('Are you sure you want to stop the application and backend server?')) {
        // Show loading state
        const stopBtn = document.querySelector('button[onclick="stopApplication()"]');
        const originalText = stopBtn.innerHTML;
        stopBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Stopping...';
        stopBtn.disabled = true;
        
        // Try to stop the backend server
        fetch('/api/stop', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            console.log('Stop server response:', response.status, response.statusText);
            return response.text();
        })
        .then(result => {
            console.log('Stop server result:', result);
            
            // Show success message
            stopBtn.innerHTML = '<i class="fas fa-check"></i> Stopped!';
            stopBtn.style.backgroundColor = '#28a745';
            
            // Wait a moment then try to close
            setTimeout(() => {
                try {
                    // Try multiple methods to close the window
                    if (window.opener) {
                        window.close();
                    } else {
                        // For windows opened directly, try to redirect to a blank page
                        window.location.href = 'about:blank';
                        setTimeout(() => {
                            window.close();
                        }, 100);
                    }
                } catch (e) {
                    console.log('Could not close window automatically:', e);
                    alert('Backend server stopped successfully! You can now close this tab manually.');
                }
            }, 1000);
        })
        .catch(error => {
            console.error('Error stopping server:', error);
            
            // Reset button
            stopBtn.innerHTML = originalText;
            stopBtn.disabled = false;
            
            // Check if server is not running with Werkzeug
            if (error.message && error.message.includes('Failed to fetch')) {
                alert('Could not connect to backend server. The server may already be stopped or not running with the default Flask server.');
            } else {
                alert('Error stopping server: ' + error.message);
            }
        });
    }
}

// AI Chat Functions
function openAIChat() {
    showModal('aiChatModal');
    // Focus on the input field
    setTimeout(() => {
        const input = document.getElementById('aiQueryInput');
        if (input) {
            input.focus();
        }
    }, 100);
}

function handleAIQueryKeyPress(event) {
    if (event.key === 'Enter') {
        sendAIQuery();
    }
}

function sendAIQuery() {
    const input = document.getElementById('aiQueryInput');
    const query = input.value.trim();
    
    if (!query) return;
    
    // Add user message to chat
    addMessageToChat('user', query);
    
    // Clear input
    input.value = '';
    
    // Show typing indicator
    showTypingIndicator();
    
    // Process the query with backend
    processAIQueryWithCode(query);
}

function sendSuggestion(suggestion) {
    const input = document.getElementById('aiQueryInput');
    input.value = suggestion;
    sendAIQuery();
}

function addMessageToChat(sender, message) {
    const chatMessages = document.getElementById('aiChatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `ai-message ${sender}-message`;
    
    const avatar = document.createElement('div');
    avatar.className = `ai-avatar ${sender}-avatar`;
    avatar.innerHTML = sender === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
    
    const content = document.createElement('div');
    content.className = 'ai-message-content';
    content.innerHTML = `<p>${message}</p>`;
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showTypingIndicator() {
    const chatMessages = document.getElementById('aiChatMessages');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'ai-message';
    typingDiv.id = 'typing-indicator';
    
    const avatar = document.createElement('div');
    avatar.className = 'ai-avatar';
    avatar.innerHTML = '<i class="fas fa-robot"></i>';
    
    const content = document.createElement('div');
    content.className = 'ai-message-content';
    content.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> Thinking...</p>';
    
    typingDiv.appendChild(avatar);
    typingDiv.appendChild(content);
    chatMessages.appendChild(typingDiv);
    
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

async function processAIQuery(query) {
    try {
        // Simulate AI processing time
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
        
        hideTypingIndicator();
        
        // Generate AI response based on query
        const response = generateAIResponse(query);
        addMessageToChat('ai', response);
        
    } catch (error) {
        console.error('Error processing AI query:', error);
        hideTypingIndicator();
        addMessageToChat('ai', 'Sorry, I encountered an error processing your request. Please try again.');
    }
}

function generateAIResponse(query) {
    const lowerQuery = query.toLowerCase();
    
    // Check if data is loaded
    if (!originalData || originalData.length === 0) {
        return 'Please upload a CSV file first so I can help you analyze the data.';
    }
    
    // Data summary queries
    if (lowerQuery.includes('summary') || lowerQuery.includes('overview')) {
        return generateDataSummary();
    }
    
    // Chart creation queries
    if (lowerQuery.includes('chart') || lowerQuery.includes('graph') || lowerQuery.includes('visualization')) {
        return generateChartSuggestion();
    }
    
    // Outlier detection queries
    if (lowerQuery.includes('outlier') || lowerQuery.includes('anomaly')) {
        return generateOutlierAnalysis();
    }
    
    // Correlation analysis queries
    if (lowerQuery.includes('correlation') || lowerQuery.includes('relationship')) {
        return generateCorrelationAnalysis();
    }
    
    // Statistical analysis queries
    if (lowerQuery.includes('statistic') || lowerQuery.includes('analysis')) {
        return generateStatisticalAnalysis();
    }
    
    // Specific column queries
    if (lowerQuery.includes('column') || lowerQuery.includes('field')) {
        return generateColumnAnalysis(query);
    }
    
    // Data quality queries
    if (lowerQuery.includes('quality') || lowerQuery.includes('missing') || lowerQuery.includes('null')) {
        return generateDataQualityAnalysis();
    }
    
    // Pattern and trend queries
    if (lowerQuery.includes('pattern') || lowerQuery.includes('trend')) {
        return generatePatternAnalysis();
    }
    
    // Top/bottom queries
    if (lowerQuery.includes('top') || lowerQuery.includes('highest') || lowerQuery.includes('maximum')) {
        return generateTopAnalysis(query);
    }
    
    if (lowerQuery.includes('bottom') || lowerQuery.includes('lowest') || lowerQuery.includes('minimum')) {
        return generateBottomAnalysis(query);
    }
    
    // Distribution queries
    if (lowerQuery.includes('distribution') || lowerQuery.includes('spread')) {
        return generateDistributionAnalysis();
    }
    
    // Default response with more specific suggestions
    return generateDefaultResponse(query);
}

function generateDataSummary() {
    const totalRows = originalData.length;
    const totalCols = originalData[0] ? Object.keys(originalData[0]).length : 0;
    const numericCols = getNumericColumns();
    const categoricalCols = getCategoricalColumns();
    
    // Calculate data quality metrics
    const missingData = calculateMissingData();
    const dataQuality = ((totalRows * totalCols - missingData.total) / (totalRows * totalCols) * 100).toFixed(1);
    
    // Get sample of first few rows
    const sampleRows = originalData.slice(0, 3);
    const sampleData = sampleRows.map((row, index) => {
        const rowData = Object.entries(row).slice(0, 3).map(([key, value]) => `${key}: ${value}`).join(', ');
        return `Row ${index + 1}: ${rowData}${Object.keys(row).length > 3 ? '...' : ''}`;
    });
    
    return `📊 **Comprehensive Data Summary**
    
    📈 **Dataset Overview**:
    • **Total Records**: ${totalRows.toLocaleString()}
    • **Total Columns**: ${totalCols}
    • **Data Quality**: ${dataQuality}%
    • **Missing Values**: ${missingData.total} (${((missingData.total / (totalRows * totalCols)) * 100).toFixed(1)}%)
    
    📊 **Column Types**:
    • **Numeric Columns**: ${numericCols.length} (${numericCols.join(', ')})
    • **Categorical Columns**: ${categoricalCols.length} (${categoricalCols.join(', ')})
    
    📋 **Sample Data** (first 3 rows):
    ${sampleData.join('\n')}
    
    💡 **Quick Insights**:
    • ${numericCols.length > 0 ? `Ready for statistical analysis on ${numericCols.length} numeric columns` : 'No numeric columns for statistical analysis'}
    • ${categoricalCols.length > 0 ? `Ready for categorical analysis on ${categoricalCols.length} text columns` : 'No categorical columns for text analysis'}
    • ${dataQuality > 95 ? 'Excellent data quality' : dataQuality > 80 ? 'Good data quality with some missing values' : 'Data quality issues detected'}
    
    Ask me for specific analysis like "analyze column [name]" or "show data quality report"!`;
}

function generateChartSuggestion() {
    const numericCols = getNumericColumns();
    const categoricalCols = getCategoricalColumns();
    
    if (numericCols.length === 0) {
        return 'I notice your data doesn\'t have numeric columns suitable for charts. Consider adding some numeric data for better visualization options.';
    }
    
    return `📈 **Chart Suggestions**
    
    Based on your data, I recommend these visualizations:
    
    • **Bar Chart**: Show the distribution of categorical data
    • **Line Chart**: Track trends over time (if you have date columns)
    • **Scatter Plot**: Explore relationships between numeric columns
    • **Histogram**: Analyze the distribution of numeric values
    
    Would you like me to create any of these charts for you?`;
}

function generateOutlierAnalysis() {
    const numericCols = getNumericColumns();
    
    if (numericCols.length === 0) {
        return 'Outlier detection requires numeric data. Your current dataset doesn\'t have numeric columns suitable for this analysis.';
    }
    
    const outlierResults = numericCols.map(col => {
        const values = originalData.map(row => parseFloat(row[col])).filter(val => !isNaN(val));
        if (values.length === 0) return null;
        
        const stats = calculateColumnStats(values);
        const outlierPercentage = ((stats.outliers.length / values.length) * 100).toFixed(1);
        
        return `**${col}**:
• Total values: ${values.length}
• Outliers found: ${stats.outliers.length} (${outlierPercentage}%)
• Outlier range: ${stats.outliers.length > 0 ? `${Math.min(...stats.outliers).toFixed(2)} to ${Math.max(...stats.outliers).toFixed(2)}` : 'None'}
• Normal range: ${(stats.median - 1.5 * (stats.q3 - stats.q1)).toFixed(2)} to ${(stats.median + 1.5 * (stats.q3 - stats.q1)).toFixed(2)}`;
    }).filter(result => result !== null);
    
    return `🔍 **Outlier Analysis Results**
    
${outlierResults.join('\n\n')}

💡 **Interpretation**:
• Outliers are values that fall outside 1.5 × IQR (Interquartile Range)
• High outlier percentages (>5%) may indicate data quality issues
• Outliers can represent genuine anomalies or measurement errors
• Consider investigating outliers in context of your domain knowledge`;
}

function generateCorrelationAnalysis() {
    const numericCols = getNumericColumns();
    
    if (numericCols.length < 2) {
        return 'Correlation analysis requires at least 2 numeric columns. Your data has ' + numericCols.length + ' numeric column(s).';
    }
    
    const correlations = [];
    
    for (let i = 0; i < numericCols.length; i++) {
        for (let j = i + 1; j < numericCols.length; j++) {
            const col1 = numericCols[i];
            const col2 = numericCols[j];
            
            const values1 = originalData.map(row => parseFloat(row[col1])).filter(val => !isNaN(val));
            const values2 = originalData.map(row => parseFloat(row[col2])).filter(val => !isNaN(val));
            
            // Align the arrays by removing rows where either value is missing
            const alignedData = [];
            for (let k = 0; k < Math.min(values1.length, values2.length); k++) {
                if (!isNaN(values1[k]) && !isNaN(values2[k])) {
                    alignedData.push([values1[k], values2[k]]);
                }
            }
            
            if (alignedData.length > 1) {
                const correlation = calculateCorrelation(alignedData.map(pair => pair[0]), alignedData.map(pair => pair[1]));
                const strength = getCorrelationStrength(correlation);
                
                correlations.push({
                    col1, col2, correlation, strength,
                    sampleSize: alignedData.length
                });
            }
        }
    }
    
    // Sort by absolute correlation value
    correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
    
    const correlationResults = correlations.map(corr => 
        `**${corr.col1} ↔ ${corr.col2}**:
• Correlation: ${corr.correlation.toFixed(3)} (${corr.strength})
• Sample size: ${corr.sampleSize} pairs`
    );
    
    return `📉 **Correlation Analysis Results**
    
${correlationResults.join('\n\n')}

💡 **Interpretation**:
• Correlation ranges from -1 (perfect negative) to +1 (perfect positive)
• Values near 0 indicate no linear relationship
• Strong correlations (|r| > 0.7) suggest potential relationships
• Correlation doesn't imply causation!`;
}

function getCorrelationStrength(correlation) {
    const absCorr = Math.abs(correlation);
    if (absCorr >= 0.9) return 'Very Strong';
    if (absCorr >= 0.7) return 'Strong';
    if (absCorr >= 0.5) return 'Moderate';
    if (absCorr >= 0.3) return 'Weak';
    return 'Very Weak';
}

function generateStatisticalAnalysis() {
    const numericCols = getNumericColumns();
    
    if (numericCols.length === 0) {
        return 'Statistical analysis requires numeric data. Your current dataset doesn\'t have numeric columns suitable for this analysis.';
    }
    
    return `📊 **Statistical Analysis**
    
    I can provide detailed statistics for your numeric columns: ${numericCols.join(', ')}
    
    This includes:
    • Mean, median, mode
    • Standard deviation and variance
    • Min/max values and ranges
    • Quartiles and percentiles
    
    Would you like me to generate a comprehensive statistical report?`;
}

function getNumericColumns() {
    if (!originalData || originalData.length === 0) return [];
    
    const firstRow = originalData[0];
    return Object.keys(firstRow).filter(col => {
        const sampleValues = originalData.slice(0, 10).map(row => row[col]);
        return sampleValues.some(val => !isNaN(parseFloat(val)) && isFinite(val));
    });
}

function getCategoricalColumns() {
    if (!originalData || originalData.length === 0) return [];
    
    const firstRow = originalData[0];
    return Object.keys(firstRow).filter(col => {
        const sampleValues = originalData.slice(0, 10).map(row => row[col]);
        return sampleValues.some(val => typeof val === 'string' || isNaN(parseFloat(val)));
    });
}

// Enhanced AI Analysis Functions
function generateColumnAnalysis(query) {
    const columns = Object.keys(originalData[0] || {});
    const numericCols = getNumericColumns();
    const categoricalCols = getCategoricalColumns();
    
    // Extract column name from query
    const columnMatch = query.match(/(?:column|field)\s+(?:named\s+)?["']?([^"'\s]+)["']?/i);
    const specificColumn = columnMatch ? columnMatch[1] : null;
    
    if (specificColumn && columns.includes(specificColumn)) {
        return analyzeSpecificColumn(specificColumn);
    }
    
    return `📋 **Column Analysis**
    
    Your dataset has ${columns.length} columns:
    
    📊 **Numeric Columns** (${numericCols.length}):
    ${numericCols.map(col => `• ${col}`).join('\n')}
    
    🏷️ **Categorical Columns** (${categoricalCols.length}):
    ${categoricalCols.map(col => `• ${col}`).join('\n')}
    
    Ask me about a specific column like "analyze column [column_name]" for detailed insights!`;
}

function analyzeSpecificColumn(columnName) {
    const values = originalData.map(row => row[columnName]).filter(val => val !== null && val !== undefined && val !== '');
    const numericValues = values.filter(val => !isNaN(parseFloat(val)) && isFinite(val)).map(val => parseFloat(val));
    
    if (numericValues.length > 0) {
        const stats = calculateColumnStats(numericValues);
        return `📊 **Analysis of Column: ${columnName}**
        
        • **Total Values**: ${values.length}
        • **Numeric Values**: ${numericValues.length}
        • **Mean**: ${stats.mean.toFixed(2)}
        • **Median**: ${stats.median.toFixed(2)}
        • **Min**: ${stats.min.toFixed(2)}
        • **Max**: ${stats.max.toFixed(2)}
        • **Standard Deviation**: ${stats.stdDev.toFixed(2)}
        
        ${stats.outliers.length > 0 ? `⚠️ **Outliers**: ${stats.outliers.length} values outside normal range` : '✅ **No significant outliers detected**'}`;
    } else {
        const uniqueValues = [...new Set(values)];
        const valueCounts = {};
        values.forEach(val => {
            valueCounts[val] = (valueCounts[val] || 0) + 1;
        });
        
        const topValues = Object.entries(valueCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);
        
        return `🏷️ **Analysis of Column: ${columnName}**
        
        • **Total Values**: ${values.length}
        • **Unique Values**: ${uniqueValues.length}
        • **Most Common Values**:
        ${topValues.map(([val, count]) => `  - "${val}": ${count} times`).join('\n')}
        
        This appears to be a categorical/text column.`;
    }
}

function generateDataQualityAnalysis() {
    const columns = Object.keys(originalData[0] || {});
    const qualityReport = [];
    let totalMissing = 0;
    
    columns.forEach(col => {
        const missingCount = originalData.filter(row => 
            row[col] === null || row[col] === undefined || row[col] === '' || row[col] === 'null'
        ).length;
        const missingPercentage = ((missingCount / originalData.length) * 100).toFixed(1);
        totalMissing += missingCount;
        
        if (missingCount > 0) {
            qualityReport.push(`• **${col}**: ${missingCount} missing values (${missingPercentage}%)`);
        }
    });
    
    const overallQuality = ((originalData.length * columns.length - totalMissing) / (originalData.length * columns.length) * 100).toFixed(1);
    
    return `📋 **Data Quality Report**
    
    📊 **Overall Data Quality**: ${overallQuality}%
    📈 **Total Records**: ${originalData.length}
    📋 **Total Columns**: ${columns.length}
    ❌ **Total Missing Values**: ${totalMissing}
    
    ${qualityReport.length > 0 ? `\n**Issues Found**:\n${qualityReport.join('\n')}` : '✅ **No missing values detected**'}
    
    💡 **Recommendations**:
    • Consider data cleaning for columns with >5% missing values
    • Check for data type inconsistencies
    • Validate data ranges for numeric columns`;
}

function generatePatternAnalysis() {
    const numericCols = getNumericColumns();
    const patterns = [];
    
    numericCols.forEach(col => {
        const values = originalData.map(row => parseFloat(row[col])).filter(val => !isNaN(val));
        if (values.length > 1) {
            const trend = calculateTrend(values);
            patterns.push(`• **${col}**: ${trend}`);
        }
    });
    
    return `🔍 **Pattern Analysis**
    
    ${patterns.length > 0 ? patterns.join('\n') : 'No clear patterns detected in numeric data.'}
    
    💡 **Additional Analysis**:
    • Ask about specific columns for detailed trend analysis
    • Request correlation analysis to find relationships
    • Use "Find outliers" to identify anomalies`;
}

function generateTopAnalysis(query) {
    const numericCols = getNumericColumns();
    const topCount = extractNumberFromQuery(query) || 10;
    
    if (numericCols.length === 0) {
        return 'No numeric columns found for top analysis.';
    }
    
    const results = numericCols.map(col => {
        const values = originalData.map((row, index) => ({
            value: parseFloat(row[col]),
            index: index
        })).filter(item => !isNaN(item.value));
        
        const sorted = values.sort((a, b) => b.value - a.value);
        const topValues = sorted.slice(0, topCount);
        
        return `**${col}** (Top ${topCount}):
${topValues.map((item, i) => `  ${i + 1}. Row ${item.index + 1}: ${item.value.toFixed(2)}`).join('\n')}`;
    });
    
    return `🏆 **Top ${topCount} Analysis**
    
${results.join('\n\n')}`;
}

function generateBottomAnalysis(query) {
    const numericCols = getNumericColumns();
    const bottomCount = extractNumberFromQuery(query) || 10;
    
    if (numericCols.length === 0) {
        return 'No numeric columns found for bottom analysis.';
    }
    
    const results = numericCols.map(col => {
        const values = originalData.map((row, index) => ({
            value: parseFloat(row[col]),
            index: index
        })).filter(item => !isNaN(item.value));
        
        const sorted = values.sort((a, b) => a.value - b.value);
        const bottomValues = sorted.slice(0, bottomCount);
        
        return `**${col}** (Bottom ${bottomCount}):
${bottomValues.map((item, i) => `  ${i + 1}. Row ${item.index + 1}: ${item.value.toFixed(2)}`).join('\n')}`;
    });
    
    return `📉 **Bottom ${bottomCount} Analysis**
    
${results.join('\n\n')}`;
}

function generateDistributionAnalysis() {
    const numericCols = getNumericColumns();
    
    if (numericCols.length === 0) {
        return 'No numeric columns found for distribution analysis.';
    }
    
    const distributions = numericCols.map(col => {
        const values = originalData.map(row => parseFloat(row[col])).filter(val => !isNaN(val));
        const stats = calculateColumnStats(values);
        
        return `**${col}**:
• Range: ${stats.min.toFixed(2)} to ${stats.max.toFixed(2)}
• Mean: ${stats.mean.toFixed(2)}
• Median: ${stats.median.toFixed(2)}
• Standard Deviation: ${stats.stdDev.toFixed(2)}
• Distribution: ${getDistributionType(stats)}`;
    });
    
    return `📊 **Distribution Analysis**
    
${distributions.join('\n\n')}`;
}

function generateDefaultResponse(query) {
    const columns = Object.keys(originalData[0] || {});
    const numericCols = getNumericColumns();
    const categoricalCols = getCategoricalColumns();
    
    return `I understand you're asking about "${query}". Here's what I can analyze in your data:
    
    📊 **Your Dataset**: ${originalData.length} rows, ${columns.length} columns
    📈 **Numeric Columns**: ${numericCols.length} (${numericCols.join(', ')})
    🏷️ **Categorical Columns**: ${categoricalCols.length} (${categoricalCols.join(', ')})
    
    💡 **Try these specific queries**:
    • "Show me the top 10 values in [column_name]"
    • "Analyze column [column_name]"
    • "Find outliers in [column_name]"
    • "What's the distribution of [column_name]?"
    • "Show data quality report"
    • "Find patterns in the data"
    
    Or use the suggestion buttons below for quick analysis!`;
}

// Helper functions
function calculateColumnStats(values) {
    const sorted = values.sort((a, b) => a - b);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    // Detect outliers (values beyond 1.5 * IQR)
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const outliers = values.filter(val => val < q1 - 1.5 * iqr || val > q3 + 1.5 * iqr);
    
    return { mean, median, min, max, stdDev, outliers, q1, q3, iqr };
}

function calculateTrend(values) {
    if (values.length < 2) return 'Insufficient data for trend analysis';
    
    const x = Array.from({length: values.length}, (_, i) => i);
    const y = values;
    
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    if (Math.abs(slope) < 0.01) return 'Stable trend';
    return slope > 0 ? 'Increasing trend' : 'Decreasing trend';
}

function extractNumberFromQuery(query) {
    const match = query.match(/(\d+)/);
    return match ? parseInt(match[1]) : null;
}

function getDistributionType(stats) {
    const skewness = (stats.mean - stats.median) / stats.stdDev;
    if (Math.abs(skewness) < 0.1) return 'Normal distribution';
    return skewness > 0 ? 'Right-skewed' : 'Left-skewed';
}

function calculateMissingData() {
    const columns = Object.keys(originalData[0] || {});
    let totalMissing = 0;
    const missingByColumn = {};
    
    columns.forEach(col => {
        const missingCount = originalData.filter(row => 
            row[col] === null || row[col] === undefined || row[col] === '' || row[col] === 'null'
        ).length;
        missingByColumn[col] = missingCount;
        totalMissing += missingCount;
    });
    
    return { total: totalMissing, byColumn: missingByColumn };
}

// --- Animation Enhancements ---
function animateTabContent(tabId) {
  const tab = document.getElementById(tabId);
  if (tab) {
    tab.classList.remove('animated');
    void tab.offsetWidth; // trigger reflow
    tab.classList.add('animated');
  }
}

function animateFileInfo() {
  const info = document.getElementById('fileInfo');
  if (info) {
    info.classList.remove('animated');
    void info.offsetWidth;
    info.classList.add('animated');
  }
}

function animateModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    const content = modal.querySelector('.modal-content');
    if (content) {
      content.classList.remove('animated');
      void content.offsetWidth;
      content.classList.add('animated');
    }
  }
}

function animateTableRows() {
  document.querySelectorAll('.excel-table tr').forEach(row => {
    row.classList.remove('row-animate');
    void row.offsetWidth;
    row.classList.add('row-animate');
    setTimeout(() => row.classList.remove('row-animate'), 700);
  });
}

function animateChartArea() {
  const chart = document.querySelector('.chart-area');
  if (chart) {
    chart.classList.remove('animated');
    void chart.offsetWidth;
    chart.classList.add('animated');
  }
}

// Enhance tab switching
const originalSwitchTab = switchTab;
switchTab = function(tabName) {
  originalSwitchTab.apply(this, arguments);
  if (tabName === 'table') animateTabContent('tableTab');
  if (tabName === 'dashboard') animateTabContent('dashboardTab');
};

// Enhance file upload feedback
const originalDisplayFileInfo = displayFileInfo;
displayFileInfo = function(file, data) {
  originalDisplayFileInfo.apply(this, arguments);
  animateFileInfo();
};

// Enhance modal open
const originalShowModal = showModal;
showModal = function(modalId) {
  originalShowModal.apply(this, arguments);
  animateModal(modalId);
};

// Animate table rows on sort/filter
const originalUpdateSorting = updateSorting;
updateSorting = function() {
  originalUpdateSorting.apply(this, arguments);
  animateTableRows();
};
const originalApplyFilters = applyFilters;
applyFilters = function() {
  originalApplyFilters.apply(this, arguments);
  animateTableRows();
};

// Animate chart area on update
const originalUpdateChart = updateChart;
updateChart = function() {
  originalUpdateChart.apply(this, arguments);
  animateChartArea();
};

// Add shimmer to AI button on hover/click
const aiBtn = document.querySelector('.btn-ai');
if (aiBtn) {
  aiBtn.addEventListener('mouseenter', () => aiBtn.classList.add('shimmer'));
  aiBtn.addEventListener('mouseleave', () => aiBtn.classList.remove('shimmer'));
  aiBtn.addEventListener('mousedown', () => aiBtn.classList.add('shimmer'));
  aiBtn.addEventListener('mouseup', () => aiBtn.classList.remove('shimmer'));
}



// AI Mode Management
function switchAIMode(mode) {
    currentAIMode = mode;
    
    // Update button states
    document.getElementById('queryModeBtn').classList.toggle('active', mode === 'query');
    document.getElementById('filterModeBtn').classList.toggle('active', mode === 'filter');
    
    // Update input placeholder
    const input = document.getElementById('aiQueryInput');
    if (mode === 'query') {
        input.placeholder = 'Ask me anything about your data...';
        document.getElementById('querySuggestions').style.display = 'block';
        document.getElementById('filterSuggestions').style.display = 'none';
    } else {
        input.placeholder = 'Describe what rows you want to see...';
        document.getElementById('querySuggestions').style.display = 'none';
        document.getElementById('filterSuggestions').style.display = 'block';
    }
    
    // Clear chat and show mode-specific welcome message
    const chatMessages = document.getElementById('aiChatMessages');
    chatMessages.innerHTML = '';
    
    const welcomeMessage = mode === 'query' 
        ? 'Hello! I can help you analyze your CSV data, create visualizations, answer questions about your data, and provide insights. What would you like to know?'
        : 'Filter mode activated! I can help you filter your data based on natural language descriptions. Try asking things like "Show rows where age is greater than 30" or "Filter by status active".';
    
    addMessageToChat('ai', welcomeMessage);
}

// Enhanced AI processing for filter mode
async function processAIQueryWithCode(query) {
    try {
        if (!currentData || currentData.length === 0) {
            hideTypingIndicator();
            addMessageToChat('ai', 'Please upload a CSV file first so I can help you analyze the data.');
            return;
        }
        
        const headers = Object.keys(currentData[0]);
        let csvData = headers.join(',') + '\n';
        currentData.forEach(row => {
            const values = headers.map(header => {
                const value = row[header] || '';
                return `"${value}"`;
            });
            csvData += values.join(',') + '\n';
        });
        
        // Modify prompt based on mode
        let prompt;
        if (currentAIMode === 'filter') {
            prompt = `You are a data filtering assistant. Given the following JavaScript array of objects 'df', write a single line of JavaScript code that filters the rows based on the user's description. Use JavaScript array methods like .filter(). Output only the code, nothing else.

User Filter Request: ${query}
DataFrame columns: ${headers.join(', ')}

Example outputs:
df.filter(row => row.age > 30)
df.filter(row => row.status === 'active')
df.filter(row => row.salary >= 50000)

Now, output the JavaScript filter code:`;
        } else {
            prompt = `You are a data analysis assistant. Given the following DataFrame 'df', write a single line of Pandas code (no explanations) that answers the user's question. Output only the code, nothing else.

User Question: ${query}
DataFrame columns: ${headers.join(', ')}

Example output:
df['column'].mean()

Now, output the code:`;
        }
        
        console.log('Sending AI request:', { csvData: csvData.substring(0, 200) + '...', question: query });
        
        const response = await fetch('/api/ai-analysis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ csvData, question: query, mode: currentAIMode })
        });
        
        console.log('Response status:', response.status);
        
        hideTypingIndicator();
        
        if (!response.ok) {
            const result = await response.json();
            addMessageToChat('ai', `Error: ${result.error || 'Unknown error'}`);
            return;
        }
        
        let result;
        try {
            result = await response.json();
            console.log('AI Response:', result);
        } catch (jsonError) {
            console.error('JSON parsing error:', jsonError);
            addMessageToChat('ai', `Error parsing response: ${jsonError.message}`);
            return;
        }
        
        // Handle filter mode differently
        if (currentAIMode === 'filter' && result.code) {
            try {
                // Apply the filter to the data
                const filterCode = result.code;
                console.log('Filter code received:', filterCode);
                console.log('Current data before filter:', currentData);
                
                const filteredResult = applyFilterToData(filterCode);
                console.log('Filtered data result:', filteredResult);
                
                // Ensure filteredResult is an array
                const filteredArray = Array.isArray(filteredResult) ? filteredResult : [filteredResult];
                
                // Update the table with filtered data
                currentData = filteredArray;
                filteredData = [...filteredArray]; // Update global filteredData
                // Fix: Convert array of arrays to array of objects if needed
                const headers = Object.keys(originalData[0] || {});
                if (filteredData.length > 0 && Array.isArray(filteredData[0])) {
                    filteredData = filteredData.map(rowArr =>
                        Object.fromEntries(headers.map((h, i) => [h, rowArr[i]]))
                    );
                }
                currentPage = 0;
                console.log('Before populateTable - filteredData:', filteredData);
                console.log('Before populateTable - filteredData length:', filteredData.length);
                populateTable();
                
                let message = '';
                message += `<div style='margin-bottom:8px;'><b>Filter Applied:</b></div><pre style='background:#f4f4f4;padding:8px;border-radius:6px;'><code>${filterCode}</code></pre>`;
                message += `<div style='margin-top:8px;'><b>Results:</b> ${filteredArray.length} rows found</div>`;
                
                addMessageToChat('ai', message);
            } catch (filterError) {
                addMessageToChat('ai', `Error applying filter: ${filterError.message}`);
            }
        } else if (result.mode === 'filter' && result.code) {
            // Handle backend filter mode response
            try {
                // Apply the filter to the data
                const filterCode = result.code;
                console.log('Filter code received from backend:', filterCode);
                console.log('Current data before filter:', currentData);
                
                const filteredResult = applyFilterToData(filterCode);
                console.log('Filtered data result:', filteredResult);
                
                // Ensure filteredResult is an array
                const filteredArray = Array.isArray(filteredResult) ? filteredResult : [filteredResult];
                
                // Update the table with filtered data
                currentData = filteredArray;
                filteredData = [...filteredArray]; // Update global filteredData
                // Fix: Convert array of arrays to array of objects if needed
                const headers = Object.keys(originalData[0] || {});
                if (filteredData.length > 0 && Array.isArray(filteredData[0])) {
                    filteredData = filteredData.map(rowArr =>
                        Object.fromEntries(headers.map((h, i) => [h, rowArr[i]]))
                    );
                }
                currentPage = 0;
                console.log('Before populateTable - filteredData:', filteredData);
                console.log('Before populateTable - filteredData length:', filteredData.length);
                populateTable();
                
                let message = '';
                message += `<div style='margin-bottom:8px;'><b>Filter Applied:</b></div><pre style='background:#f4f4f4;padding:8px;border-radius:6px;'><code>${filterCode}</code></pre>`;
                message += `<div style='margin-top:8px;'><b>Results:</b> ${filteredArray.length} rows found</div>`;
                
                addMessageToChat('ai', message);
            } catch (filterError) {
                addMessageToChat('ai', `Error applying filter: ${filterError.message}`);
            }
        } else {
            // Regular query mode
            let message = '';
            if (result.code) {
                message += `<div style='margin-bottom:8px;'><b>Pandas Query:</b></div><pre style='background:#f4f4f4;padding:8px;border-radius:6px;'><code>${result.code}</code></pre>`;
            }
            if (result.output !== undefined) {
                message += `<div style='margin-top:8px;'><b>Output:</b></div><div style='background:#f9f9f9;padding:8px;border-radius:6px;'>${typeof result.output === 'object' ? JSON.stringify(result.output, null, 2) : result.output}</div>`;
            }
            addMessageToChat('ai', message);
        }
    } catch (error) {
        console.error('AI Query Error:', error);
        hideTypingIndicator();
        addMessageToChat('ai', `Error: ${error.message || 'Sorry, I encountered an error processing your request. Please try again.'}`);
    }
}

// Helper function to apply filter to data
function applyFilterToData(filterCode) {
    // Always use originalData as the base for filtering
    const df = originalData;
    const allowedGlobals = { df };
    
    console.log('Applying filter code:', filterCode);
    console.log('DataFrame (df) available:', df);
    console.log('DataFrame length:', df ? df.length : 'undefined');
    console.log('First row sample:', df && df.length > 0 ? df[0] : 'No data');
    console.log('Column names:', df && df.length > 0 ? Object.keys(df[0]) : 'No columns');
    
    let filteredData;
    try {
        // Execute the filter code safely
        filteredData = eval(filterCode, { "__builtins__": {} }, allowedGlobals);
        console.log('Raw filtered data:', filteredData);
        console.log('Filtered data type:', typeof filteredData);
        console.log('Is array:', Array.isArray(filteredData));
        console.log('Filtered data length:', filteredData ? filteredData.length : 'undefined');
        
        // Manual test of the filter
        console.log('Manual test of filter:');
        try {
            const manualTest = df.filter(row => row.Country === 'Nepal');
            console.log('Manual test result:', manualTest);
            console.log('Manual test length:', manualTest.length);
        } catch (e) {
            console.log('Manual test failed:', e);
        }
        
        // If the result is an array of arrays, convert to array of objects
        if (Array.isArray(filteredData) && filteredData.length > 0 && Array.isArray(filteredData[0])) {
            const headers = Object.keys(originalData[0] || {});
            filteredData = filteredData.map(rowArr =>
                Object.fromEntries(headers.map((h, i) => [h, rowArr[i]]))
            );
        }
        // If the result is not an array of objects, show error
        if (!(Array.isArray(filteredData) && filteredData.length > 0 && typeof filteredData[0] === 'object' && !Array.isArray(filteredData[0]))) {
            console.error('Invalid filter result:', filteredData);
            alert('AI filter did not return an array of objects. Please rephrase your filter or try again.');
            return [];
        }
        return filteredData;
    } catch (error) {
        console.error('Error in applyFilterToData:', error);
        alert('AI filter did not return an array of objects. Please rephrase your filter or try again.');
        return [];
    }
}

// Column drag and drop functionality
function handleHeaderDragStart(e) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
    e.dataTransfer.setData('text/plain', e.target.dataset.columnIndex);
    e.target.classList.add('dragging');
}

function handleHeaderDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleHeaderDragEnter(e) {
    e.preventDefault();
    e.target.classList.add('drag-over');
}

function handleHeaderDragLeave(e) {
    e.target.classList.remove('drag-over');
}

function handleHeaderDrop(e) {
    e.preventDefault();
    e.target.classList.remove('drag-over');
    
    const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'));
    const dropTarget = e.target.closest('th');
    const dropIndex = parseInt(dropTarget.dataset.columnIndex);
    
    if (draggedIndex !== dropIndex) {
        reorderColumn(draggedIndex, dropIndex);
    }
    
    // Remove dragging class from all headers
    document.querySelectorAll('th').forEach(th => {
        th.classList.remove('dragging');
    });
}

// Column width management functions
function expandAllColumns() {
    const headers = document.querySelectorAll('#tableHeader th');
    const table = document.getElementById('dataTable');
    const tableWidth = table.offsetWidth;
    const columnWidth = Math.max(80, tableWidth / headers.length);
    
    headers.forEach((header, index) => {
        header.style.width = columnWidth + 'px';
        const cells = document.querySelectorAll(`td:nth-child(${index + 1})`);
        cells.forEach(cell => {
            cell.style.width = columnWidth + 'px';
            cell.style.minWidth = columnWidth + 'px';
        });
    });
    
    // Add visual feedback
    showNotification('All columns expanded to equal width', 'success');
}

function reduceAllColumns() {
    const headers = document.querySelectorAll('#tableHeader th');
    const minWidth = 30;
    
    headers.forEach((header, index) => {
        header.style.width = minWidth + 'px';
        const cells = document.querySelectorAll(`td:nth-child(${index + 1})`);
        cells.forEach(cell => {
            cell.style.width = minWidth + 'px';
            cell.style.minWidth = minWidth + 'px';
        });
    });
    
    showNotification('All columns reduced to minimum width', 'success');
}

function autoFitColumns() {
    const headers = document.querySelectorAll('#tableHeader th');
    const table = document.getElementById('dataTable');
    const tableWidth = table.offsetWidth;
    
    headers.forEach((header, index) => {
        // Calculate optimal width based on content
        const columnData = Array.from(document.querySelectorAll(`td:nth-child(${index + 1})`));
        const headerText = header.textContent || header.innerText;
        
        // Get maximum content width
        let maxWidth = headerText.length * 8; // Approximate character width
        
        columnData.forEach(cell => {
            const cellText = cell.textContent || cell.innerText;
            const cellWidth = cellText.length * 8;
            maxWidth = Math.max(maxWidth, cellWidth);
        });
        
        // Add padding and ensure minimum/maximum bounds
        const optimalWidth = Math.max(80, Math.min(300, maxWidth + 20));
        
        header.style.width = optimalWidth + 'px';
        const cells = document.querySelectorAll(`td:nth-child(${index + 1})`);
        cells.forEach(cell => {
            cell.style.width = optimalWidth + 'px';
            cell.style.minWidth = optimalWidth + 'px';
        });
    });
    
    showNotification('Columns auto-fitted to content', 'success');
}

function resetColumnWidths() {
    const headers = document.querySelectorAll('#tableHeader th');
    
    headers.forEach((header, index) => {
        header.style.width = '';
        header.style.minWidth = '';
        const cells = document.querySelectorAll(`td:nth-child(${index + 1})`);
        cells.forEach(cell => {
            cell.style.width = '';
            cell.style.minWidth = '';
        });
    });
    
    showNotification('Column widths reset to default', 'success');
}

function showColumnWidthMenu() {
    const menu = document.createElement('div');
    menu.className = 'column-width-menu';
    menu.innerHTML = `
        <div class="menu-header">Column Width Options</div>
        <div class="menu-item" onclick="expandAllColumns()">
            <i class="fas fa-expand-arrows-alt"></i> Expand All Columns
        </div>
        <div class="menu-item" onclick="reduceAllColumns()">
            <i class="fas fa-compress-arrows-alt"></i> Reduce All Columns
        </div>
        <div class="menu-item" onclick="autoFitColumns()">
            <i class="fas fa-magic"></i> Auto-Fit to Content
        </div>
        <div class="menu-item" onclick="resetColumnWidths()">
            <i class="fas fa-undo"></i> Reset to Default
        </div>
        <div class="menu-item" onclick="closeColumnWidthMenu()">
            <i class="fas fa-times"></i> Close
        </div>
    `;
    
    // Position the menu
    const tableContainer = document.querySelector('.table-container');
    if (tableContainer) {
        tableContainer.appendChild(menu);
        
        // Position near the table
        const tableRect = tableContainer.getBoundingClientRect();
        menu.style.position = 'absolute';
        menu.style.top = '10px';
        menu.style.right = '10px';
        menu.style.zIndex = '1000';
    }
}

function closeColumnWidthMenu() {
    const menu = document.querySelector('.column-width-menu');
    if (menu) {
        menu.remove();
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Enhanced column resizing with better visual feedback and multi-column support
function makeHeadersResizable() {
    const headers = document.querySelectorAll('#tableHeader th');
    console.log('Making headers resizable. Found headers:', headers.length);
    headers.forEach((header, index) => {
        const resizer = document.createElement('div');
        resizer.className = 'column-resizer';
        resizer.style.position = 'absolute';
        resizer.style.right = '0';
        resizer.style.top = '0';
        resizer.style.width = '8px';
        resizer.style.height = '100%';
        resizer.style.cursor = 'col-resize';
        resizer.style.backgroundColor = 'transparent';
        resizer.style.zIndex = '10';
        
        // Add hover effect with resize indicator
        resizer.addEventListener('mouseenter', () => {
            resizer.style.backgroundColor = '#2196f3';
            resizer.style.width = '8px';
            header.style.borderRight = '2px solid #2196f3';
        });
        
        resizer.addEventListener('mouseleave', () => {
            if (!isResizing) {
                resizer.style.backgroundColor = 'transparent';
                header.style.borderRight = '';
            }
        });
        
        // Enhanced resize functionality
        resizer.onmousedown = (e) => {
            e.preventDefault();
            isResizing = true;
            currentResizeColumn = index;
            document.body.style.cursor = 'col-resize';
            resizer.style.backgroundColor = '#1976d2';
            header.style.borderRight = '2px solid #1976d2';
            
            // Add resize guide
            const guide = document.createElement('div');
            guide.className = 'resize-guide';
            guide.style.position = 'absolute';
            guide.style.top = '0';
            guide.style.left = e.clientX + 'px';
            guide.style.width = '2px';
            guide.style.height = '100vh';
            guide.style.backgroundColor = '#1976d2';
            guide.style.zIndex = '10000';
            guide.style.pointerEvents = 'none';
            document.body.appendChild(guide);
            
            // Store guide reference
            resizer.resizeGuide = guide;
        };
        
        header.style.position = 'relative';
        header.appendChild(resizer);
        
        // Make headers draggable for reordering
        header.draggable = true;
        header.ondragstart = (e) => {
            isDragging = true;
            draggedColumn = index;
            e.dataTransfer.setData('text/plain', index);
        };
        
        header.ondragover = (e) => e.preventDefault();
        header.ondrop = (e) => {
            e.preventDefault();
            const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
            const toIndex = index;
            if (fromIndex !== toIndex) {
                reorderColumn(fromIndex, toIndex);
            }
        };
    });
}

// Width indicator functions
function showWidthIndicator(width) {
    let indicator = document.getElementById('width-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'width-indicator';
        indicator.className = 'width-indicator';
        document.body.appendChild(indicator);
    }
    
    indicator.textContent = `${width}px`;
    indicator.style.display = 'block';
    
    // Position near mouse cursor
    const mouseX = event.clientX;
    const mouseY = event.clientY;
    indicator.style.left = (mouseX + 10) + 'px';
    indicator.style.top = (mouseY - 30) + 'px';
}

function hideWidthIndicator() {
    const indicator = document.getElementById('width-indicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
}

// Single header action menu function
function showHeaderActionMenu(columnName, event) {
    // Close any existing menus first
    closeHeaderActionMenu();
    
    const menu = document.createElement('div');
    menu.className = 'header-action-menu';
    menu.innerHTML = `
        <div class="menu-header">${columnName}</div>
        <div class="menu-item" onclick="sortByColumn('${columnName}'); closeHeaderActionMenu();">
            <i class="fas fa-sort"></i> Sort Column
        </div>
        <div class="menu-item" onclick="showColumnFilter('${columnName}'); closeHeaderActionMenu();">
            <i class="fas fa-filter"></i> Filter Column
        </div>
        <div class="menu-item" onclick="showColumnStats('${columnName}'); closeHeaderActionMenu();">
            <i class="fas fa-chart-bar"></i> Column Stats
        </div>
        <div class="menu-item" onclick="renameColumn('${columnName}'); closeHeaderActionMenu();">
            <i class="fas fa-edit"></i> Rename Column
        </div>
        <div class="menu-item" onclick="hideColumn('${columnName}'); closeHeaderActionMenu();">
            <i class="fas fa-eye-slash"></i> Hide Column
        </div>
        <div class="menu-item" onclick="clearColumnFilter('${columnName}'); closeHeaderActionMenu();">
            <i class="fas fa-times"></i> Clear Filter
        </div>
    `;
    
    // Position the menu near the button
    const button = event.target.closest('.header-action-btn');
    const buttonRect = button.getBoundingClientRect();
    
    menu.style.position = 'absolute';
    menu.style.top = (buttonRect.bottom + 5) + 'px';
    menu.style.left = (buttonRect.left - 150) + 'px'; // Align to the right of the button
    menu.style.zIndex = '1000';
    
    document.body.appendChild(menu);
    
    // Close menu when clicking outside
    setTimeout(() => {
        document.addEventListener('click', closeHeaderActionMenu);
    }, 100);
}

function closeHeaderActionMenu() {
    const menu = document.querySelector('.header-action-menu');
    if (menu) {
        menu.remove();
    }
    document.removeEventListener('click', closeHeaderActionMenu);
}

// Full-screen table functionality
function toggleFullScreen() {
    const tableContainer = document.querySelector('.table-container');
    const tableControls = document.querySelector('.table-controls');
    const activeFilters = document.getElementById('activeFilters');
    const pagination = document.getElementById('pagination');
    const tableInfo = document.querySelector('.table-info');
    const appHeader = document.querySelector('.app-header');
    const tabNavigation = document.querySelector('.tab-navigation');
    const uploadSection = document.querySelector('.upload-section');
    const floatingAiBtn = document.querySelector('.floating-ai-btn');
    
    if (!tableContainer.classList.contains('fullscreen-mode')) {
        // Enter full-screen mode
        tableContainer.classList.add('fullscreen-mode');
        
        // Hide other UI elements
        if (tableControls) tableControls.style.display = 'none';
        if (activeFilters) activeFilters.style.display = 'none';
        if (pagination) pagination.style.display = 'none';
        if (tableInfo) tableInfo.style.display = 'none';
        if (appHeader) appHeader.style.display = 'none';
        if (tabNavigation) tabNavigation.style.display = 'none';
        if (uploadSection) uploadSection.style.display = 'none';
        if (floatingAiBtn) floatingAiBtn.style.display = 'none';
        
        // Add full-screen controls
        addFullScreenControls();
        
        // Update button
        const fullScreenBtn = document.querySelector('button[onclick="toggleFullScreen()"]');
        if (fullScreenBtn) {
            fullScreenBtn.innerHTML = '<i class="fas fa-compress"></i> Exit Full Screen';
            fullScreenBtn.onclick = toggleFullScreen;
        }
        
        // Add escape key listener
        document.addEventListener('keydown', handleFullScreenEscape);
        
        showNotification('Entered full-screen mode. Press ESC to exit.', 'info');
    } else {
        // Exit full-screen mode
        tableContainer.classList.remove('fullscreen-mode');
        
        // Show other UI elements
        if (tableControls) tableControls.style.display = '';
        if (activeFilters) activeFilters.style.display = '';
        if (pagination) pagination.style.display = '';
        if (tableInfo) tableInfo.style.display = '';
        if (appHeader) appHeader.style.display = '';
        if (tabNavigation) tabNavigation.style.display = '';
        if (uploadSection) uploadSection.style.display = '';
        if (floatingAiBtn) floatingAiBtn.style.display = '';
        
        // Remove full-screen controls
        removeFullScreenControls();
        
        // Update button
        const fullScreenBtn = document.querySelector('button[onclick="toggleFullScreen()"]');
        if (fullScreenBtn) {
            fullScreenBtn.innerHTML = '<i class="fas fa-expand"></i> Full Screen';
            fullScreenBtn.onclick = toggleFullScreen;
        }
        
        // Remove escape key listener
        document.removeEventListener('keydown', handleFullScreenEscape);
        
        showNotification('Exited full-screen mode.', 'info');
    }
}

function addFullScreenControls() {
    const tableContainer = document.querySelector('.table-container');
    
    // Create full-screen header
    const fullScreenHeader = document.createElement('div');
    fullScreenHeader.className = 'fullscreen-header';
    fullScreenHeader.innerHTML = `
        <div class="fullscreen-title">
            <i class="fas fa-table"></i>
            <span>CSV Data Viewer - Full Screen Mode</span>
        </div>
        <div class="fullscreen-controls">
            <button class="btn btn-sm btn-secondary" onclick="exportData('csv')" title="Export CSV">
                <i class="fas fa-download"></i>
            </button>
            <button class="btn btn-sm btn-secondary" onclick="toggleFullScreen()" title="Exit Full Screen">
                <i class="fas fa-compress"></i>
            </button>
        </div>
    `;
    
    tableContainer.insertBefore(fullScreenHeader, tableContainer.firstChild);
}

function removeFullScreenControls() {
    const fullScreenHeader = document.querySelector('.fullscreen-header');
    if (fullScreenHeader) {
        fullScreenHeader.remove();
    }
}

function handleFullScreenEscape(event) {
    if (event.key === 'Escape') {
        toggleFullScreen();
    }
}