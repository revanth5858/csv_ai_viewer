from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_cors import CORS
import pandas as pd
import numpy as np
import ollama
import io
import os
from typing import Dict, List, Any, Optional
import warnings
warnings.filterwarnings('ignore')

app = Flask(__name__)
CORS(app)

# Serve static files
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory('.', filename)

def check_ollama_connection():
    """Check if Ollama is available and llama3 model is installed"""
    try:
        models_response = ollama.list()
        if hasattr(models_response, 'models'):
            models = models_response.models
        elif isinstance(models_response, (list, tuple)):
            models = models_response
        else:
            models = []
        model_names = [getattr(model, 'model', None) for model in models]
        if not any(name and str(name).startswith('llama3') for name in model_names):
            return False, "llama3 model not found. Please install it with: ollama pull llama3"
        return True, "Ollama connection successful"
    except Exception as e:
        return False, f"Ollama connection failed: {str(e)}. Please ensure Ollama is running."

def detect_data_types(df):
    """Detect data types for each column"""
    data_types = {}
    for col in df.columns:
        try:
            pd.to_numeric(df[col], errors='raise')
            data_types[col] = 'numeric'
        except:
            try:
                pd.to_datetime(df[col], errors='raise')
                data_types[col] = 'datetime'
            except:
                if df[col].nunique() < min(20, len(df) // 10):
                    data_types[col] = 'categorical'
                else:
                    data_types[col] = 'text'
    return data_types

def ai_analysis(data_info, question):
    """Get AI analysis using Ollama"""
    try:
        df_full = data_info.get('df_full', None)
        if df_full is None:
            df_full = pd.DataFrame(data_info.get('sample_data', {}))
        else:
            df_full = df_full.copy()
        
        df_preview = df_full.head(20)
        df_markdown = df_preview.to_markdown(index=False)
        
        numeric_stats = {}
        numeric_cols = data_info.get('numeric_cols', [])
        for col in numeric_cols:
            if col in df_full.columns:
                try:
                    numeric_data = pd.to_numeric(df_full[col], errors='coerce')
                    if not numeric_data.isna().all():
                        numeric_stats[col] = {
                            'min': numeric_data.min(),
                            'max': numeric_data.max(),
                            'mean': numeric_data.mean(),
                            'count': numeric_data.count()
                        }
                except:
                    continue
        
        numeric_desc = ""
        for col, stats in numeric_stats.items():
            try:
                quantiles = pd.to_numeric(df_full[col], errors='coerce').quantile([0.25, 0.5, 0.75]).to_dict()
                numeric_desc += f"- {col}: min={stats['min']:.2f}, max={stats['max']:.2f}, mean={stats['mean']:.2f}, count={stats['count']}, "
                if quantiles:
                    numeric_desc += f"Q1={quantiles.get(0.25, ''):.2f}, Median={quantiles.get(0.5, ''):.2f}, Q3={quantiles.get(0.75, ''):.2f}"
                numeric_desc += "\n"
            except:
                numeric_desc += f"- {col}: min={stats['min']}, max={stats['max']}, mean={stats['mean']:.2f}, count={stats['count']}\n"
        
        categorical_samples = {}
        categorical_cols = data_info.get('categorical_cols', [])
        for col in categorical_cols:
            if col in df_full.columns:
                try:
                    value_counts = df_full[col].value_counts().to_dict()
                    categorical_samples[col] = value_counts
                except:
                    continue
        
        categorical_desc = ""
        for col, samples in categorical_samples.items():
            if col in df_full.columns:
                try:
                    value_counts = df_full[col].value_counts().to_dict()
                    top_values = list(value_counts.items())[:5]
                    categorical_desc += f"- {col}: top values: {', '.join([f'{k} ({v})' for k,v in top_values])}\n"
                except:
                    continue
        
        missing_info = data_info.get('missing_values', {})
        missing_desc = ""
        for col, count in missing_info.items():
            if count > 0:
                missing_desc += f"- {col}: {count} missing values\n"
        
        context = f"""
You are a helpful data analyst assistant. Here is a preview of the user's dataset (first 20 rows):

{df_markdown}

Numeric columns summary (computed on the entire dataset):
{numeric_desc}

Categorical columns summary (computed on the entire dataset):
{categorical_desc}

Missing values (computed on the entire dataset):
{missing_desc}

User Question: {question}

Please answer ONLY based on the data above. If the answer is not in the data, say 'I don't know based on the provided data.'
Keep your answer short, direct, and user-friendly. Do not provide code or technical explanations.
"""
        
        response = ollama.chat(model='llama3', messages=[
            {
                'role': 'user',
                'content': context
            }
        ])
        
        return response['message']['content']
    except Exception as e:
        return f"Error connecting to AI service: {str(e)}. Please ensure Ollama is running and the llama3 model is installed."

@app.route('/api/ai-analysis', methods=['POST'])
def analyze_data():
    """API endpoint for AI analysis"""
    try:
        data = request.json
        csv_data = data.get('csvData', '')
        question = data.get('question', '')
        
        if not csv_data or not question:
            return jsonify({'error': 'Missing CSV data or question'}), 400
        
        # Parse CSV data
        df = pd.read_csv(io.StringIO(csv_data))
        
        # Check Ollama connection
        ollama_available, ollama_message = check_ollama_connection()
        if not ollama_available:
            return jsonify({'error': ollama_message}), 500
        
        # Calculate data types
        data_types = detect_data_types(df)
        numeric_cols = [col for col in df.columns if data_types[col] == 'numeric']
        categorical_cols = [col for col in df.columns if data_types[col] == 'categorical']
        
        data_info = {
            'shape': df.shape,
            'columns': list(df.columns),
            'dtypes': data_types,
            'numeric_cols': numeric_cols,
            'categorical_cols': categorical_cols,
            'missing_values': df.isnull().sum().to_dict(),
            'sample_data': df.head(20).to_dict(),
            'df': df.head(20) if len(df) > 20 else df,
            'df_full': df
        }
        
        # Get AI analysis
        response = ai_analysis(data_info, question)
        
        return jsonify({'response': response})
        
    except Exception as e:
        return jsonify({'error': f'Error processing request: {str(e)}'}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'message': 'CSV AI Viewer is running'})

if __name__ == '__main__':
    print("🚀 Starting CSV AI Viewer Server...")
    print("📊 Access the application at: http://localhost:5000")
    print("🤖 AI features require Ollama to be running with llama3 model")
    print("💡 To install llama3: ollama pull llama3")
    print("\n" + "="*50)
    
    app.run(debug=True, host='0.0.0.0', port=5000) 