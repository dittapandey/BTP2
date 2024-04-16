from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
from pymongo import MongoClient
from flask_uploads import UploadSet, configure_uploads, DATA
import json
# from metaphone import doublemetaphone
from fuzzywuzzy import fuzz
import csv
import pandas as pd
from io import StringIO
import numpy as np
from pymongo import ReturnDocument
# import ObjectID
from bson.objectid import ObjectId
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from keras.models import Sequential
from keras.layers import Dense, InputLayer, Softmax

# import logging

app = Flask(__name__)

# app.logger.setLevel(logging.INFO)  # Set log level to INFO
# handler = logging.FileHandler('app.log')  # Log to a file
# app.logger.addHandler(handler)

CORS(app)

upload_dir = 'uploads'
app.config['UPLOADS_DEFAULT_DEST'] = upload_dir
uploads = UploadSet('csvs', DATA)
configure_uploads(app, uploads)
MONGO_URI = "mongodb+srv://akshayjan2003:quzENIrWYBtCryhB@cluster0.jmirxnu.mongodb.net"
client = MongoClient(MONGO_URI)

db = client['test']


class sentence_model():
    def __init__(self, model_path, transformer, nlabels=5, method='cosine'):
        self.model_path = model_path
        self.transformer = transformer
        self.nlabels = nlabels
        self.method = method
        self.lr_model = Sequential([
            InputLayer(input_shape=(transformer.encode("Hello World!").shape[0]*2,)),
            Dense(nlabels, activation='sigmoid'),
            Softmax()
        ])
        self.lr_model.load_weights(self.model_path)

    
    def __call__(self, text1, text2):
        enc1 = self.transformer.encode(text1)
        enc2 = self.transformer.encode(text2)
        if self.method == 'lr':
            features = np.concatenate([np.abs(enc1-enc2), enc1*enc2]).reshape(1,-1)
            # print(features.shape, enc1.shape, enc2.shape)
            predictions = self.lr_model.predict(features)
            # print(predictions.shape, predictions)
            return np.dot(predictions, np.arange(1,self.nlabels+1))[0]/self.nlabels
        elif self.method == 'cosine':
            return cosine_similarity([enc1], [enc2])[0][0]

        

class NameData():
    """
        name = StringField
        gender = CharField
        diagnosis = StringField
        phone = StringField
    """
    __transformer__ = SentenceTransformer('../MINILM')
    __lr_model_path__ = '../Models_SICK/MINILM/model.h5'
    collection = db["name_data"]
    diagnosis_model = sentence_model(__lr_model_path__, __transformer__)


    def __init__(self, name, gender, diagnosis, phone):
        self.name = name
        self.gender = gender
        self.diagnosis = diagnosis
        self.phone = phone
        # self.diagnosis_model = sentence_model(self.__lr_model_path__, self.__transformer__)

    def save(self):
        try:
            NameData.collection.insert_one(self.__dict__)
        except Exception as e:
            print(f"Error saving record: {e}")

    @classmethod
    def get_all_names(cls, encoding):
        arr = cls.collection.find({"encoding": encoding})
        return [el['name'] for el in arr]

    @classmethod
    def fuzzy_search(cls, search_term, score_cutoff=80):
        results = []
        cursor = cls.collection.find()
        for document in cursor:
            score = fuzz.ratio(search_term.lower(), document['encoding'].lower())
            if score >= score_cutoff:
                results.append((document, score))
        return results
    
    @classmethod
    def fuzzy_matching(cls, str1,str2):
        return fuzz.ratio(str1.lower(),str2.lower())

    @classmethod
    def get_fuzzy_matrix(cls, name1, name2):
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
    def AdvancedQuery(cls, search_term, diagnosis, domain, tol=80, sim_score=0.88):
        results = []
        name2_l = search_term.lower().split()

        if len(name2_l)==0:
                return results

        for document in domain:
            name1_l = document['name'].lower().split()

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
                
            # a, b = cls._transformer__(document['diagnosis'], diagnosis) if diagnosis is not None else (0, 0)
            doc_similarity = cls.diagnosis_model(document['diagnosis'], diagnosis) if diagnosis is not None else 0

            if avg_ratio>tol:
                results.append((document, avg_ratio, doc_similarity))

        return results
    
    # @classmethod
    # def DiagnosisQuery(cls, diagnosis, domain, score=0.88):
    #     results = []
    #     for document in domain:
    #         a, b = cls._transformer__(document.diagnosis, diagnosis)
    #         if cosine_similarity([a], [b]) >= score:
    #             results.append(document)
    #     return results
    
    @classmethod
    def PhoneQuery(cls, phone, domain):
        results = []
        for document in domain:
            if str(phone) == document['phone']:
                results.append(document)
        return results if len(results) > 0 else domain
    
    @classmethod
    def GenderQuery(cls, gender, domain):
        results = []
        for document in domain:
            if gender.lower() == document['gender'].lower():
                results.append(document)
        return results 

    @classmethod
    def QueryRecord(cls, name, gender=None, diagnosis=None, phone=None):
        results = cls.collection.find()
        results = [document for document in results]
        if phone is not None:
            results = cls.PhoneQuery(phone, results)
        if gender is not None:
            results = cls.GenderQuery(gender, results)
        
        if name is not None:
            results = cls.AdvancedQuery(name, diagnosis, results)
        else:
            results = [(document, 0, 0) for document in results]

        return results

    @classmethod
    def clear_all(cls):
        cls.collection.delete_many({})

    @classmethod
    def find(cls, dict_ = {}):
        return cls.collection.find(dict_)

    @classmethod
    def bulk_insert(cls, data):
        cls.collection.insert_many(data)

    @classmethod    
    def update(cls, uuid, data):
        return cls.collection.find_one_and_update({'_id': ObjectId(uuid)}, {'$set': data}, return_document=ReturnDocument.AFTER)



@app.route('/query', methods=['POST'])
def query():
    try:
        data = request.data
        data = json.loads(data)
        # if 'name' not in data or 'gender' not in data or 'diagnosis' not in data or 'phone' not in data:
        #     return jsonify({"error": "Invalid request"}), 400
        name = data.get('name', None)
        gender = data.get('gender', None)
        diagnosis = data.get('diagnosis', None)
        phone = data.get('phone', None)

        if name == '':
            name = None
        if diagnosis == '':
            diagnosis = None
        if phone == '':
            phone = None
        if gender == '':
            gender = None

        if name is not None:
            name = name.strip()
        if diagnosis is not None:
            diagnosis = diagnosis.strip()
        if phone is not None:
            phone = phone.strip()
        if gender is not None:
            gender = gender.strip()

        # print("Querying: ", name, diagnosis, phone, gender)
        # print("types: ", type(name), type(diagnosis), type(phone), type(gender))

        res = NameData.QueryRecord(name, gender, diagnosis, phone)
        sorted_results = sorted(res, key=lambda x: (x[1],x[2]), reverse=True)
        if len(sorted_results) > 5:
            sorted_results = sorted_results[:5]

        return jsonify([{
            "name": el[0]['name'],
            "phone": el[0]['phone'],
            "diagnosis": el[0]['diagnosis'],
            "gender": el[0]['gender'],
            "uuid": str(el[0]['_id']),
        } for el in sorted_results])
    except Exception as e:
        return jsonify(e), 500


@app.route('/entry', methods=['POST'])
def newEntry():
    try:
        # print("Request received")
        data = request.data
        # print("Data received")
        data = json.loads(data)
        # if 'name' not in data or 'gender' not in data or 'diagnosis' not in data or 'phone' not in data:
        #     return jsonify({"error": "Invalid request"}), 400

        name = data.get('name', None)
        gender = data.get('gender', None)
        diagnosis = data.get('diagnosis', None)
        phone = data.get('phone', None)

        # print("Stripping data")

        if name is not None:
            name = name.strip()
        if diagnosis is not None:
            diagnosis = diagnosis.strip()
        if phone is not None:
            phone = phone.strip()
        if gender is not None:
            gender = gender.strip()

        # print(f"New Entry: {name} : {type(name)}, {diagnosis} : {type(diagnosis)}, {phone} : {type(phone)}, {gender} : {type(gender)}")
        # app.logger.info(f"NewEntry: {name}")

        dbData = NameData(name=name, gender=gender, diagnosis=diagnosis, phone=phone) 
        print(dbData.__dict__)
        dbData.save()
        return f"Successly added {name}::{gender}:{diagnosis}:{phone}", 200
    except:
        return "Server Error (CS)", 500

@app.route('/update', methods=['PUT'])
def updateEntry():
    try:
        data = request.data
        data = json.loads(data)
        if 'uuid' not in data:
            return jsonify({"error": "Invalid request"}), 400
        uuid = data['uuid']
        name = data.get('name', None)
        diagnosis = data.get('diagnosis', None)
        phone = data.get('phone', None)
        gender = data.get('gender', None)

        update_data = {}
        if name is not None:
            update_data['name'] = name.strip()
        if diagnosis is not None:
            update_data['diagnosis'] = diagnosis.strip()
        if phone is not None:
            update_data['phone'] = phone.strip()
        if gender is not None:
            update_data['gender'] = gender.strip()

        updated = NameData.update(uuid, update_data)
        if updated is None:
            return jsonify({"error": "Record not found"}), 404

        return jsonify({"message": "Record updated successfully!",
                        "name": updated['name'],
                        "phone": updated['phone'],
                        "diagnosis": updated['diagnosis'],
                        "gender": updated['gender'],
                        "uuid": str(updated['_id'])
                    })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
        


@app.route('/cleardb', methods=['DELETE'])
def clearDB():
    try:
        NameData.clear_all()
        return jsonify({"message": "Database cleared successfully!"})
    except:
        return jsonify({"error": "Failed to clear database!"}), 500

@app.route('/csv', methods=['GET'])
def download_data():
    try:
        cursor = NameData.find({})
       # Use StringIO as an in-memory file for writing CSV data
        si = StringIO()
        csv_writer = csv.writer(si)

        # Create CSV header
        csv_writer.writerow(["Sr.no", "Name", "Gender", "Diagnosis", "Phone"])

        # Add document data to CSV rows
        for cnt, document in enumerate(cursor, start=1):
            csv_writer.writerow([cnt, document.get('name', ''), document.get('gender', ''), document.get('diagnosis', ''), document.get('phone', '')])

        # Seek to start
        si.seek(0)
        csv_output = si.getvalue()

        # Set response headers for CSV download
        response = make_response(csv_output)
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
        if not uploaded_file.filename.lower().endswith(".csv"):
            return jsonify({"error": "Invalid file format. Please upload a CSV file."}), 400

        # Convert byte stream to a string stream for csv.reader
        csv_file = StringIO(uploaded_file.stream.read().decode("utf-8"), newline=None)

        # Create a csv.DictReader object
        reader = csv.DictReader(csv_file)

        uploaddata = []
        for row in reader:
            # Normalize or map keys here
            normalized_row = {key.lower(): value.strip() for key, value in row.items()}
            
            # Use normalized/mapped keys
            uploaddata.append({
                "name": normalized_row.get('name', '-').title(),
                "gender": normalized_row.get('gender', '-'),
                "diagnosis": normalized_row.get('diagnosis', '-'),
                "phone": normalized_row.get('phone', '-')
            })

        # Assuming NameData.bulk_insert() method can handle the list of dictionaries
        NameData.bulk_insert(uploaddata)

        return jsonify({"message": "Data uploaded successfully!"})
    except Exception as e:
        return jsonify({"error": f"Error uploading data: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(port=4000)
