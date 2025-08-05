# CSV AI Viewer

A comprehensive web-based CSV viewer with Excel-like features, PowerBI-style dashboard, and AI-powered data analysis capabilities.

## Features

### Data Table Features
- **Excel-like Interface**: Sortable columns, inline editing, pagination
- **Advanced Filtering**: Global and column-specific filters
- **Data Validation**: Automatic data type detection and validation
- **Export Options**: CSV and Excel export with statistics
- **Column Controls**: Hide, rename, and analyze columns

### Dashboard Features
- **PowerBI-style Dashboard**: Interactive charts and visualizations
- **Multiple Chart Types**: Bar, Line, Pie, Scatter, Area, Histogram, Heatmap, Box Plot, Funnel, Radar
- **Advanced Analytics**: Statistical summaries, outlier detection, correlation analysis
- **Interactive Controls**: Chart settings, drill-down capabilities, calculated fields
- **Real-time Metrics**: Key performance indicators and data quality metrics

### AI Integration
- **Natural Language Queries**: Ask questions about your data in plain English
- **Intelligent Analysis**: AI-powered insights and recommendations
- **Data Modification**: AI-assisted data cleaning and transformation

## Setup Instructions

### Prerequisites

1. **Python 3.8+** installed on your system
2. **Ollama** installed and running (for AI features)
   - Download from: https://ollama.ai
   - Install a model: `ollama pull llama2`

### Installation

1. **Clone or download the project files**

2. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Test the setup**:
   ```bash
   python test_setup.py
   ```

4. **Start the application**:
   ```bash
   python app.py
   ```

5. **Open your browser** and go to:
   ```
   http://localhost:5000
   ```

## Usage

### Uploading Data
1. Click "Choose File" or drag and drop a CSV file
2. The application will automatically parse and display your data
3. Use the tab navigation to switch between "Data Table" and "PowerBI Dashboard"

### Data Table Features
- **Sorting**: Click column headers to sort data
- **Filtering**: Use the global filter or column-specific filters
- **Editing**: Click on any cell to edit inline
- **Export**: Use the export buttons to download data in various formats

### Dashboard Features
- **Chart Creation**: Select chart type, X-axis, and Y-axis to create visualizations
- **Quick Charts**: Use the suggested charts for common visualizations
- **Advanced Analytics**: View statistical summaries and data insights
- **Chart Settings**: Customize chart appearance and behavior

### AI Analysis
1. Type your question in the AI analysis section
2. Ask questions like:
   - "What are the main trends in this data?"
   - "Which columns have missing values?"
   - "Show me the correlation between sales and profit"
   - "What insights can you find in this dataset?"

## Troubleshooting

### Common Issues

**1. "Parsing error while uploading CSV"**
- **Solution**: The improved CSV parser now handles complex formats better
- **Check**: Ensure your CSV file has proper headers and data
- **Debug**: Check browser console for detailed error messages

**2. "Charts are not coming correctly"**
- **Solution**: Use the "Refresh Options" button in the dashboard
- **Check**: Ensure you've selected both X and Y axes
- **Debug**: Check browser console for chart generation errors

**3. "Column names are not loading"**
- **Solution**: Use the "Debug Dashboard" button
- **Check**: Ensure your CSV has proper headers
- **Debug**: Check browser console for DOM element errors

**4. "AI features not working"**
- **Solution**: Ensure Ollama is running and a model is installed
- **Check**: Run `ollama list` to see available models
- **Install**: Run `ollama pull llama2` to install a model

**5. "Server connection failed"**
- **Solution**: Ensure the Flask server is running
- **Check**: Run `python app.py` and check for errors
- **Port**: Ensure port 5000 is not in use

### Debug Tools

The application includes several debug features:

1. **Browser Console**: Press F12 to open developer tools and check for errors
2. **Debug Buttons**: Use "Refresh Options" and "Debug Dashboard" buttons
3. **Test Script**: Run `python test_setup.py` to verify your setup
4. **Health Check**: The application automatically tests backend connectivity

### Performance Tips

1. **Large Files**: For files > 10MB, consider splitting into smaller chunks
2. **Memory Usage**: Close other applications if experiencing slowdowns
3. **Browser**: Use Chrome or Firefox for best performance
4. **Network**: Ensure stable internet connection for AI features

## File Structure

```
csv_ai_viewer/
├── app.py              # Flask backend server
├── index.html          # Main HTML interface
├── styles.css          # CSS styling
├── script.js           # JavaScript functionality
├── requirements.txt    # Python dependencies
├── test_setup.py      # Setup verification script
└── README.md          # This file
```

## Technical Details

### Backend (Flask)
- **Framework**: Flask with CORS support
- **AI Integration**: Ollama client for natural language processing
- **Data Processing**: Pandas for data manipulation and analysis
- **Export**: Excel and CSV export with statistics

### Frontend (HTML/CSS/JavaScript)
- **Framework**: Vanilla JavaScript for maximum compatibility
- **Charts**: Custom SVG-based chart generation
- **UI**: Modern CSS with responsive design
- **Interactivity**: Real-time data updates and user interactions

### Data Processing
- **CSV Parsing**: Robust parser handling complex CSV formats
- **Data Types**: Automatic detection of numeric, categorical, and date columns
- **Validation**: Comprehensive data validation and error handling
- **Performance**: Optimized for large datasets

## Contributing

To contribute to this project:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Run the test script: `python test_setup.py`
3. Check browser console for error messages
4. Ensure all dependencies are installed correctly

For additional support, please provide:
- Error messages from browser console
- Steps to reproduce the issue
- Your system configuration (OS, browser, etc.) 

pip install -r csv_ai_viewer/requirements.txt