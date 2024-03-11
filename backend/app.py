from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
from flask_mongoengine import MongoEngine, Document
from flask_uploads import UploadSet, configure_uploads, DATA
import json
from metaphone import doublemetaphone
from fuzzywuzzy import fuzz
import csv
import pandas as pd
from io import StringIO



app = Flask(__name__)
CORS(app)

upload_dir = 'uploads'
app.config['UPLOADS_DEFAULT_DEST'] = upload_dir
uploads = UploadSet('csvs', DATA)
configure_uploads(app, uploads)


app.config['MONGODB_SETTINGS'] = {
    'db': 'voiceOfAlcher',
    'host': 'mongodb+srv://akshayjan2003:quzENIrWYBtCryhB@cluster0.jmirxnu.mongodb.net',
    'port': 27017,
    'authentication_source': 'admin',
    'retryWrites': True,
    'connect': True
}

db = MongoEngine(app)


class NameData(db.Document):
    name = db.StringField()
    encoding = db.StringField()

    @classmethod
    def get_all_names(cls, encoding):
        return [document.name for document in cls.objects(encoding=encoding)]

    @classmethod
    def fuzzy_search(cls, search_term, score_cutoff=80):
        results = []
        for document in cls.objects:
            score = fuzz.ratio(search_term.lower(), document.encoding.lower())
            if score >= score_cutoff:
                results.append((document, score))
        return results

    @classmethod
    def clear_all(cls):
        cls.objects.delete()




@app.route('/query', methods=['POST'])
def query():
    try:
        data = request.data
        data = json.loads(data)
        if 'query' not in data:
            return jsonify({"error": "Invalid request"}), 400
        query = data['query']
        res = NameData.fuzzy_search(query)
        sorted_results = sorted(res, key=lambda x: x[1], reverse=True)
        if len(sorted_results) > 5:
            sorted_results = sorted_results[:5]

        return [el[0].name for el in sorted_results]
    except Exception as e:
        return jsonify(e), 500


def encodeName(string):
        string = string.lower()
        for a in string:
            if (ord(a)<97 or ord(a)>122) and ord(a)!=ord(' '):
                string = ''.join(string.split(a))
        
        strings = string.split(' ')
        
        final_str = ''
        for string in strings:
            final_str = final_str + doublemetaphone(string)[0]
            
        return final_str


@app.route('/entry', methods=['POST'])
def testdb():
    try:
        data = request.data
        data = json.loads(data)
        if 'name' not in data:
            return jsonify({"error": "Invalid request"}), 400
        name = data['name']
        encoding = encodeName(name)
        dbData = NameData(name=name, encoding=encoding)
        dbData.save()
        return f"Successly added {name}::{encoding}", 200
    except:
        return "Server Error (CS)", 500


@app.route('/cleardb', methods=['GET'])
def clearDB():
    try:
        NameData.clear_all()
        return jsonify({"message": "Database cleared successfully!"})
    except:
        return jsonify({"error": "Failed to clear database!"}), 500

@app.route('/csv', methods=['GET'])
def download_data():
    try:
        data = NameData.objects.all()
        csv_data = []

        # Create CSV header
        csv_data.append(["Name", "Encoding"])

        # Add document data to CSV rows
        for document in data:
            csv_data.append([document.name, document.encoding])

        # Generate CSV string
        csv_string = "\n".join([",".join(row) for row in csv_data])
        print(csv_string)

        # Set response headers for CSV download
        response = make_response(csv_string)
        response.headers['Content-Type'] = 'text/csv; charset=utf-8'
        response.headers['Content-Disposition'] = 'attachment; filename=data.csv'
        return response
    except Exception as e:
        return jsonify(e), 500

@app.route('/csv', methods=['POST'])
def upload_data():
    try:
        # Check for uploaded file
        if 'file' not in request.files:
            return jsonify({"error": "No file uploaded!"}), 400

        # Get uploaded file
        uploaded_file = request.files['file']

        # Validate file extension
        if uploaded_file.filename.lower().endswith(".csv") is False:
            return jsonify({"error": "Invalid file format. Please upload a CSV file."}), 400

        fstt = uploaded_file.stream
        skipFirst = False
        for lines in fstt.readlines():
            if skipFirst is False:
                skipFirst = True
                continue
            lines = lines.decode('utf-8')
            row = lines.split(',')
            print(row[0].strip(), row[1].strip())
            new_data = NameData(name=row[0].strip(), encoding=row[1].strip())
            new_data.save()

        return jsonify({"message": "Data uploaded successfully!"})
    except Exception as e:
        jsoned = jsonify(e)
        return jsonify({"error": f"Error uploading data: {jsoned}"}), 500


if __name__ == '__main__':
    app.run(port=4000)
