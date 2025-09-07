from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import pandas as pd
import numpy as np
import google.generativeai as genai
import warnings
import io
import os
from typing import Dict, List, Any, Optional
import json
import xlsxwriter
import xlrd
import openpyxl
from io import BytesIO
import base64

warnings.filterwarnings('ignore')

app = Flask(__name__)
CORS(app)

# Global variable to store the current dataset
current_dataset = None

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('.', filename)

@app.route('/api/ai-analysis', methods=['POST'])
def ai_analysis():
    try:
        print("=== AI ANALYSIS DEBUG START ===")
        
        data = request.get_json()
        csv_data = data.get('csvData', '')
        question = data.get('question', '')
        mode = data.get('mode', 'query')  # Default to query mode
        api_key = data.get('apiKey', '')

        print(f"DEBUG: Received question: {question}")
        print(f"DEBUG: Received mode: {mode}")
        print(f"DEBUG: CSV data length: {len(csv_data) if csv_data else 0}")

        if not api_key:
            return jsonify({'error': 'Missing Gemini API Key'}), 400
        if not csv_data or not question:
            return jsonify({'error': 'Missing CSV data or question'}), 400

        df = pd.read_csv(io.StringIO(csv_data))
        global current_dataset
        current_dataset = df

        print(f"DEBUG: DataFrame shape: {df.shape}")
        print(f"DEBUG: DataFrame columns: {list(df.columns)}")

        # Generate prompt based on mode
        if mode == 'filter':
            prompt = f"""
You are a data filtering assistant. Given the following JavaScript array of objects 'df', where each row is an object with keys as column names, write a single line of JavaScript code that filters the rows based on the user's description. Use only dot notation (row.columnName) to access values. Output only the code, nothing else.

User Filter Request: {question}
DataFrame columns: {list(df.columns)}

Example outputs:
df.filter(row => row.age > 30)
df.filter(row => row.status === 'active')
df.filter(row => row.salary >= 50000)

Now, output the JavaScript filter code:
"""
        else:
            # Default query mode - use pandas
            prompt = f"""
You are a data analysis assistant. Given the following DataFrame 'df', write a single line of Pandas code (no explanations) that answers the user's question. Output only the code, nothing else.

User Question: {question}
DataFrame columns: {list(df.columns)}

Example output:
df['column'].mean()

Now, output the code:
"""

        print(f"DEBUG: Generated prompt: {prompt}")

        # Use Gemini
        try:
            genai.configure(api_key=api_key)
            
            model = genai.GenerativeModel('gemini-2.5-flash')
            response = model.generate_content(prompt)
            code = response.text.strip().split('\n')[0]
        except Exception as e:
            print(f'DEBUG: Error in Gemini API call: {e}')
            return jsonify({'error': f'Error calling Gemini API: {str(e)}'}), 500

        print(f'DEBUG: Generated code: {code}')

        # Handle filter mode differently - don't execute JavaScript code on backend
        if mode == 'filter':
            print('DEBUG: Filter mode - returning JavaScript code without execution')
            return jsonify({'code': code, 'output': None, 'mode': 'filter'})
        
        # For query mode, validate and execute pandas code
        # Only allow code that starts with 'df'
        if not code.startswith('df'):
            print('DEBUG: Code does not start with df:', code)
            return jsonify({'error': 'Generated code is not safe or valid.'}), 400

        # Execute the code safely
        try:
            allowed_builtins = {'df': df}
            result = eval(code, {"__builtins__": {}}, allowed_builtins)
            print('DEBUG: Code execution result:', result)
            print('DEBUG: Type of result:', type(result))
            # Convert result to string for JSON
            if hasattr(result, 'to_dict'):
                result = result.to_dict()
            elif hasattr(result, 'tolist'):
                result = result.tolist()
            else:
                result = str(result)
            print('DEBUG: Final result for JSON:', result)
        except Exception as e:
            print(f'DEBUG: Error executing code: {e}')
            return jsonify({'error': f'Error executing code: {e}'}), 400

        print("=== AI ANALYSIS DEBUG END ===")
        return jsonify({'code': code, 'output': result})

    except Exception as e:
        print(f'DEBUG: Unexpected error in ai_analysis: {e}')
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/data-info', methods=['GET'])
def get_data_info():
    global current_dataset
    
    if current_dataset is None:
        return jsonify({'error': 'No dataset loaded'}), 404
    
    try:
        data_info = {
            'rows': len(current_dataset),
            'columns': len(current_dataset.columns),
            'column_names': list(current_dataset.columns),
            'data_types': current_dataset.dtypes.to_dict(),
            'missing_values': current_dataset.isnull().sum().to_dict(),
            'numeric_columns': current_dataset.select_dtypes(include=[np.number]).columns.tolist(),
            'categorical_columns': current_dataset.select_dtypes(include=['object']).columns.tolist()
        }
        
        return jsonify(data_info)
        
    except Exception as e:
        return jsonify({'error': f'Error getting data info: {str(e)}'}), 500

@app.route('/api/export', methods=['POST'])
def export_data():
    try:
        data = request.get_json()
        csv_data = data.get('csvData', '')
        format_type = data.get('format', 'csv')
        filename = data.get('filename', 'exported_data')
        
        if not csv_data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Convert CSV string to DataFrame
        df = pd.read_csv(io.StringIO(csv_data))
        
        if format_type == 'csv':
            output = df.to_csv(index=False)
            return jsonify({
                'data': output,
                'filename': f'{filename}.csv',
                'mime_type': 'text/csv'
            })
        elif format_type == 'excel':
            # Create Excel file with multiple sheets
            output = io.BytesIO()
            with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
                df.to_excel(writer, sheet_name='Data', index=False)
                
                # Add statistics sheet
                stats_df = pd.DataFrame({
                    'Column': df.columns,
                    'Data Type': df.dtypes.astype(str),
                    'Missing Values': df.isnull().sum(),
                    'Unique Values': df.nunique(),
                    'Min': df.select_dtypes(include=[np.number]).min(),
                    'Max': df.select_dtypes(include=[np.number]).max(),
                    'Mean': df.select_dtypes(include=[np.number]).mean()
                })
                stats_df.to_excel(writer, sheet_name='Statistics', index=False)
            
            output.seek(0)
            return jsonify({
                'data': output.getvalue().decode('latin1'),  # Binary data as string
                'filename': f'{filename}.xlsx',
                'mime_type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            })
        else:
            return jsonify({'error': 'Unsupported format'}), 400
            
    except Exception as e:
        return jsonify({'error': f'Export error: {str(e)}'}), 500

@app.route('/api/export-xlsx', methods=['POST'])
def export_xlsx():
    try:
        data = request.json
        df = pd.DataFrame(data['data'])
        
        # Create Excel file in memory
        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Sheet1', index=False)
        
        output.seek(0)
        excel_data = base64.b64encode(output.read()).decode()
        
        return jsonify({
            'success': True,
            'data': excel_data,
            'filename': 'export.xlsx'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/import-xlsx', methods=['POST'])
def import_xlsx():
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file uploaded'})
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'error': 'No file selected'})
        
        # Read Excel file
        df = pd.read_excel(file, engine='openpyxl')
        data = df.to_dict('records')
        
        return jsonify({
            'success': True,
            'data': data,
            'columns': list(df.columns)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/export-json', methods=['POST'])
def export_json():
    try:
        data = request.json
        json_data = json.dumps(data['data'], indent=2)
        
        return jsonify({
            'success': True,
            'data': json_data,
            'filename': 'export.json'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/import-json', methods=['POST'])
def import_json():
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file uploaded'})
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'error': 'No file selected'})
        
        # Read JSON file
        content = file.read().decode('utf-8')
        data = json.loads(content)
        
        if isinstance(data, list) and len(data) > 0:
            columns = list(data[0].keys())
        else:
            columns = []
        
        return jsonify({
            'success': True,
            'data': data,
            'columns': columns
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy', 
        'message': 'CSV AI Viewer API is running',
        'server_type': 'Flask Development Server' if request.environ.get('werkzeug.server.shutdown') else 'Other Server'
    })


if __name__ == '__main__':
    print("Starting CSV AI Viewer Flask Server...")
    print("Server will be available at: http://localhost:5000")
    print("AI features are powered by Gemini. Make sure to have a valid API key.")
    app.run(debug=True, host='0.0.0.0', port=5000)

 