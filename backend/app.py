import os
import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.utils import secure_filename
from mesonet_logic import analyze_video

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# --- CONFIGURATION ---
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(BASE_DIR, 'goodroad.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = os.path.join(BASE_DIR, 'uploads')

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

db = SQLAlchemy(app)

# --- DATABASE MODEL ---
class Submission(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    violation_type = db.Column(db.String(50))
    location = db.Column(db.String(100))
    date_captured = db.Column(db.String(20))
    time_captured = db.Column(db.String(20))
    
    # Kept in DB for record-keeping
    phone_number = db.Column(db.String(20)) 
    
    bank_details = db.Column(db.String(100))
    description = db.Column(db.Text)
    filename = db.Column(db.String(200))
    status = db.Column(db.String(20), default='uploaded') 
    confidence_score = db.Column(db.Float, default=0.0)
    timestamp = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'violationType': self.violation_type,
            'location': self.location,
            'date': self.date_captured,
            'time': self.time_captured,
            'phoneNumber': self.phone_number, 
            'bankDetails': self.bank_details,
            'description': self.description,
            'fileName': self.filename,
            'status': self.status,
            'confidenceScore': self.confidence_score,
            'timestamp': self.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
            'videoUrl': f"http://localhost:5000/uploads/{self.filename}"
        }

# --- ROUTES ---

@app.route('/api/submit', methods=['POST'])
def submit_video():
    if 'video' not in request.files:
        return jsonify({'error': 'No video file provided'}), 400
    
    file = request.files['video']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    if file:
        filename = secure_filename(file.filename)
        unique_filename = f"{int(datetime.datetime.now().timestamp())}_{filename}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        file.save(filepath)

        # 1. Create Submission Record
        new_sub = Submission(
            violation_type=request.form.get('violationType'),
            location=request.form.get('location'),
            date_captured=request.form.get('date'),
            time_captured=request.form.get('time'),
            phone_number=request.form.get('phoneNumber'), 
            bank_details=request.form.get('bankDetails'),
            description=request.form.get('description'),
            filename=unique_filename,
            status='analyzing'
        )
        db.session.add(new_sub)
        db.session.commit()

        # 2. Run Analysis
        print(f"Starting MesoNet analysis on {unique_filename}...")
        status, score = analyze_video(filepath)
        
        new_sub.status = status
        new_sub.confidence_score = score
        db.session.commit()

        return jsonify(new_sub.to_dict()), 201

@app.route('/api/submissions', methods=['GET'])
def get_submissions():
    submissions = Submission.query.order_by(Submission.timestamp.desc()).all()
    return jsonify([s.to_dict() for s in submissions])

@app.route('/api/submissions/<int:id>', methods=['DELETE'])
def delete_submission(id):
    submission = Submission.query.get_or_404(id)
    try:
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], submission.filename)
        if os.path.exists(file_path):
            os.remove(file_path)
    except Exception as e:
        print(f"Error deleting file: {e}")

    db.session.delete(submission)
    db.session.commit()
    return jsonify({'message': 'Deleted successfully'}), 200

@app.route('/uploads/<filename>')
def serve_video(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(debug=True, port=5000)