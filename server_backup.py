from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime
import json
import os

app = Flask(__name__)
CORS(app)

HISTORY_FILE = 'scan_history.json'

# Load history from file
def load_history():
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, 'r') as f:
                return json.load(f)
        except:
            return []
    return []

# Save history to file
def save_history(history):
    with open(HISTORY_FILE, 'w') as f:
        json.dump(history, f, indent=2)

# Dummy vulnerability analysis (simulating graphCODEBERT model)
def analyze_code_vulnerabilities(code_snippet, language):
    """
    This function simulates the graphCODEBERT model's vulnerability analysis.
    In production, this would load the actual model and perform real analysis.
    """
    lines = code_snippet.split('\n')
    vulnerabilities = []
    
    # Simulate finding vulnerabilities in specific lines
    # In production, replace this with actual model inference
    for i, line in enumerate(lines, 1):
        # Dummy detection patterns (replace with model predictions)
        line_lower = line.lower()
        
        if 'password' in line_lower and 'input' in line_lower:
            vulnerabilities.append({
                "line": i,
                "content": line.strip(),
                "vulnerability_type": "Hardcoded Password",
                "severity": "high",
                "description": "Password input detected without proper encryption",
                "suggestion": "Use secure password handling and encryption"
            })
        elif 'sql' in line_lower and '+' in line:
            vulnerabilities.append({
                "line": i,
                "content": line.strip(),
                "vulnerability_type": "SQL Injection",
                "severity": "critical",
                "description": "Potential SQL injection vulnerability detected",
                "suggestion": "Use parameterized queries instead of string concatenation"
            })
        elif 'eval(' in line_lower or 'exec(' in line_lower:
            vulnerabilities.append({
                "line": i,
                "content": line.strip(),
                "vulnerability_type": "Code Injection",
                "severity": "critical",
                "description": "Dynamic code execution detected",
                "suggestion": "Avoid using eval() or exec() with user input"
            })
        elif 'request.' in line_lower and 'get' in line_lower and 'parameter' in line_lower:
            vulnerabilities.append({
                "line": i,
                "content": line.strip(),
                "vulnerability_type": "XSS Vulnerability",
                "severity": "medium",
                "description": "User input used without sanitization",
                "suggestion": "Sanitize user input before rendering"
            })
    
    return {
        "total_lines": len(lines),
        "vulnerabilities_found": len(vulnerabilities),
        "overall_risk": "low" if len(vulnerabilities) == 0 else "medium" if len(vulnerabilities) <= 3 else "high",
        "vulnerabilities": vulnerabilities
    }

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "model": "graphCODEBERT"})

@app.route('/api/scan', methods=['POST'])
def scan_code():
    """
    Endpoint to scan code for vulnerabilities.
    This is a dummy endpoint - replace with actual model integration later.
    """
    try:
        data = request.json
        code_snippet = data.get('code', '')
        language = data.get('language', 'auto')
        
        if not code_snippet:
            return jsonify({"error": "Code snippet is required"}), 400
        
        # Analyze code (dummy analysis for now)
        result = analyze_code_vulnerabilities(code_snippet, language)
        
        # Create history entry
        history = load_history()
        history_entry = {
            "id": len(history) + 1,
            "timestamp": datetime.now().isoformat(),
            "language": language,
            "code_lines": len(code_snippet.split('\n')),
            "vulnerabilities_found": result["vulnerabilities_found"],
            "overall_risk": result["overall_risk"],
            "sample_vulnerabilities": result["vulnerabilities"][:3]  # Store first 3 for preview
        }
        history.insert(0, history_entry)  # Add to beginning
        save_history(history[:100])  # Keep last 100 entries
        
        return jsonify(result)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/history', methods=['GET'])
def get_history():
    """Get scan history"""
    history = load_history()
    return jsonify({"history": history[:50]})  # Return last 50 entries

@app.route('/api/history/<int:entry_id>', methods=['GET'])
def get_history_entry(entry_id):
    """Get specific history entry"""
    history = load_history()
    entry = next((h for h in history if h['id'] == entry_id), None)
    if entry:
        return jsonify(entry)
    return jsonify({"error": "Entry not found"}), 404

if __name__ == '__main__':
    app.run(debug=True, port=5000)
