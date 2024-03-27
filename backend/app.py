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
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

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
    gender = db.CharField()
    diagnosis = db.StringField()
    number = db.StringField()

    __transformer__ = SentenceTransformer('PubMedBert')

    @classmethod
    def get_all_names(cls, encoding):
        return [document.name for document in cls.objects(encoding=encoding)]

    @classmethod
    def __fuzzy_search(cls, search_term, score_cutoff=80):
        results = []
        for document in cls.objects:
            score = fuzz.ratio(search_term.lower(), document.encoding.lower())
            if score >= score_cutoff:
                results.append((document, score))
        return results
    
    @classmethod
    def __fuzzy_matching(cls, str1,str2):
        return fuzz.ratio(str1.lower(),str2.lower())

    @classmethod
    def __get_fuzzy_matrix(cls, name1, name2):
        ratio_matrix = []
        # print(name1, name2)
        for i in range(len(name1)):
            temp=[]
            for j in range(len(name2)):
                temp.append(cls.fuzzy_matching(name1[i], name2[j]))
            ratio_matrix.append(temp)
        ratio_matrix = np.array(ratio_matrix)
        return ratio_matrix
    
    @classmethod
    def __AdvancedQuery(cls, search_term, diagnosis, domain, tol=80, sim_score=0.88):
        results = []
        name2_l = search_term.lower().split()

        if len(name2_l)==0:
                return results

        for document in domain:
            name1_l = document.name.lower().split()

            # print(name1_l, len(name1_l))
            if len(name1_l)==0:
                continue

            fuzz_matrix=cls.get_fuzzy_matrix(name1_l,name2_l)
            if(fuzz_matrix.shape[0]>fuzz_matrix.shape[1]):
                maxInColumns = np.amax(fuzz_matrix, axis=0)
                row_index=fuzz_matrix.argmax(axis=0)
                avg_ratio= np.sum(maxInColumns)/ fuzz_matrix.shape[1]
            else:
                maxInRows = np.amax(fuzz_matrix, axis=1)
                col_index = fuzz_matrix.argmax(axis=1)
                avg_ratio = np.sum(maxInRows) / fuzz_matrix.shape[0]
            
            a, b = cls._transformer__(document.diagnosis, diagnosis) if diagnosis is not None else (0, 0)
            if cosine_similarity([a], [b]) >= sim_score or avg_ratio>tol:
                results.append((document, avg_ratio, sim_score))

        return results
    
    # @classmethod
    # def __DiagnosisQuery(cls, diagnosis, domain, score=0.88):
    #     results = []
    #     for document in domain:
    #         a, b = cls._transformer__(document.diagnosis, diagnosis)
    #         if cosine_similarity([a], [b]) >= score:
    #             results.append(document)
    #     return results
    
    @classmethod
    def __NumberQuery(cls, number):
        results = []
        for document in cls.objects:
            if str(number) == document.number:
                results.append(document)
        return results
    
    @classmethod
    def __GenderQuery(cls, gender, domain):
        results = []
        for document in domain:
            if gender.lower() == document.gender.lower():
                results.append(document)
        return results 

    @classmethod
    def QueryRecord(cls, name, gender=None, diagnosis=None, number=None):
        results = cls.objects
        if number is not None:
            results = cls.__NumberQuery(number, results)
        if gender is not None:
            results = cls.__GenderQuery(gender, results)
        results = cls.__AdvancedQuery(name, diagnosis, results)

        return results

    @classmethod
    def clear_all(cls):
        cls.objects.delete()

@app.route('/query', methods=['POST'])
def query():
    try:
        data = request.data
        data = json.loads(data)
        if 'query' not in data or 'gender' not in data or 'diagnosis' not in data or 'number' not in data:
            return jsonify({"error": "Invalid request"}), 400
        
        name = data['query']
        gender = data['gender']
        diagnosis = data['diagnosis']
        number = data['number']
        # encodedQuery = encodeName(query)
        res = NameData.QueryRecord(name, gender, diagnosis, number)
        sorted_results = sorted(res, key=lambda x: x[1], reverse=True)
        if len(sorted_results) > 5:
            sorted_results = sorted_results[:5]

        return [el[0].name for el in sorted_results]
    except Exception as e:
        return jsonify(e), 500



@app.route('/entry', methods=['POST'])
def testdb():
    try:
        data = request.data
        data = json.loads(data)
        if 'name' not in data or 'gender' not in data or 'diagnosis' not in data or 'number' not in data:
            return jsonify({"error": "Invalid request"}), 400
        name = data['name']
        gender = data['gender']
        diagnosis = data['diagnosis']
        number = data['number']
        dbData = NameData(name=name, gender=gender, diagnosis=diagnosis, number=number) 
        dbData.save()
        return f"Successly added {name}::{gender}:{diagnosis}:{number}", 200
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
        csv_data.append(["Name", "Gender", "Diagnosis", "Number"])

        # Add document data to CSV rows
        for document in data:
            csv_data.append([document.name, document.gender, document.diagnosis, document.number])

        # Generate CSV string
        csv_string = "\n".join([",".join(row) for row in csv_data])
        # print(csv_string)

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
            # print(row[0].strip(), row[1].strip())
            new_data = NameData(name=row[1].strip(), gender=row[2].strip(), diagnosis=row[3].strip(), number=row[4].strip())
            new_data.save()

        return jsonify({"message": "Data uploaded successfully!"})
    except Exception as e:
        jsoned = jsonify(e)
        return jsonify({"error": f"Error uploading data: {jsoned}"}), 500


if __name__ == '__main__':
    app.run(port=4000)
