from flask import Flask, request, jsonify, session, send_from_directory, render_template
import sqlite3
import os
import csv
import io
from datetime import datetime
from werkzeug.utils import secure_filename
import json

app = Flask(__name__)
app.secret_key = 'vb2026_secret_key_change_in_production'

# Configuration
MAX_TEAMS = 30
ENTRY_FEE = 200
UPLOAD_FOLDER = 'static/uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'gif'}
ADMIN_USERNAME = 'admin'
ADMIN_PASSWORD = 'vb2026admin'

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

DB_PATH = 'tournament.db'

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS teams (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            team_id TEXT UNIQUE NOT NULL,
            team_name TEXT NOT NULL,
            captain_name TEXT NOT NULL,
            phone TEXT UNIQUE NOT NULL,
            team_size INTEGER NOT NULL,
            hometown TEXT NOT NULL,
            payment_screenshot TEXT,
            payment_status TEXT DEFAULT 'pending',
            created_at TEXT NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

def generate_team_id():
    conn = get_db()
    row = conn.execute('SELECT COUNT(*) as cnt FROM teams').fetchone()
    count = row['cnt'] + 1
    conn.close()
    return f"VB2026-{count:03d}"

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_slot_info():
    conn = get_db()
    total = conn.execute('SELECT COUNT(*) as cnt FROM teams').fetchone()['cnt']
    conn.close()
    return {'booked': total, 'max': MAX_TEAMS, 'available': MAX_TEAMS - total}

# ─── Pages ───────────────────────────────────────────────────────────────────

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/register')
def register_page():
    return render_template('register.html')

@app.route('/payment')
def payment_page():
    return render_template('payment.html')

@app.route('/success')
def success_page():
    return render_template('success.html')

@app.route('/admin')
def admin_page():
    return render_template('admin.html')

# ─── API ─────────────────────────────────────────────────────────────────────

@app.route('/api/slots')
def get_slots():
    return jsonify(get_slot_info())

@app.route('/api/register', methods=['POST'])
def register():
    slots = get_slot_info()
    if slots['available'] <= 0:
        return jsonify({'error': 'Registrations are closed. All slots are filled.'}), 400

    data = request.json
    required = ['team_name', 'captain_name', 'phone', 'team_size', 'hometown']
    for field in required:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400

    phone = str(data['phone']).strip()
    team_size = int(data['team_size'])
    if team_size < 6 or team_size > 12:
        return jsonify({'error': 'Team size must be between 6 and 12'}), 400

    conn = get_db()
    existing = conn.execute('SELECT id FROM teams WHERE phone = ?', (phone,)).fetchone()
    if existing:
        conn.close()
        return jsonify({'error': 'A team with this phone number is already registered'}), 400

    team_id = generate_team_id()
    created_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    try:
        conn.execute('''
            INSERT INTO teams (team_id, team_name, captain_name, phone, team_size, hometown, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (team_id, data['team_name'].strip(), data['captain_name'].strip(),
              phone, team_size, data['hometown'].strip(), created_at))
        conn.commit()
    except sqlite3.IntegrityError as e:
        conn.close()
        return jsonify({'error': 'Registration failed. Phone number may already exist.'}), 400

    conn.close()
    return jsonify({
        'success': True,
        'team_id': team_id,
        'team_name': data['team_name'],
        'message': 'Registration successful! Please proceed to payment.'
    })

@app.route('/api/upload-payment', methods=['POST'])
def upload_payment():
    team_id = request.form.get('team_id')
    if not team_id:
        return jsonify({'error': 'Team ID is required'}), 400

    if 'screenshot' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['screenshot']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    if not allowed_file(file.filename):
        return jsonify({'error': 'Only image files are allowed (PNG, JPG, JPEG, WEBP, GIF)'}), 400

    conn = get_db()
    team = conn.execute('SELECT id FROM teams WHERE team_id = ?', (team_id,)).fetchone()
    if not team:
        conn.close()
        return jsonify({'error': 'Team not found'}), 404

    filename = secure_filename(f"{team_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}_{file.filename}")
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)

    conn.execute('UPDATE teams SET payment_screenshot = ? WHERE team_id = ?', (filename, team_id))
    conn.commit()
    conn.close()

    return jsonify({'success': True, 'message': 'Payment screenshot uploaded successfully!'})

@app.route('/api/team/<team_id>')
def get_team(team_id):
    conn = get_db()
    team = conn.execute('SELECT * FROM teams WHERE team_id = ?', (team_id,)).fetchone()
    conn.close()
    if not team:
        return jsonify({'error': 'Team not found'}), 404
    return jsonify(dict(team))

@app.route('/api/teams')
def get_teams():
    conn = get_db()
    teams = conn.execute('SELECT * FROM teams ORDER BY created_at DESC').fetchall()
    conn.close()
    return jsonify([dict(t) for t in teams])

# ─── Admin API ────────────────────────────────────────────────────────────────

@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    data = request.json
    if data.get('username') == ADMIN_USERNAME and data.get('password') == ADMIN_PASSWORD:
        session['admin'] = True
        return jsonify({'success': True})
    return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/api/admin/logout', methods=['POST'])
def admin_logout():
    session.pop('admin', None)
    return jsonify({'success': True})

@app.route('/api/admin/check')
def admin_check():
    return jsonify({'authenticated': session.get('admin', False)})

def admin_required(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get('admin'):
            return jsonify({'error': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated

@app.route('/api/admin/update-status', methods=['POST'])
@admin_required
def update_status():
    data = request.json
    team_id = data.get('team_id')
    status = data.get('status')
    if status not in ('pending', 'approved', 'rejected'):
        return jsonify({'error': 'Invalid status'}), 400
    conn = get_db()
    conn.execute('UPDATE teams SET payment_status = ? WHERE team_id = ?', (status, team_id))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

@app.route('/api/admin/delete-team/<team_id>', methods=['DELETE'])
@admin_required
def delete_team(team_id):
    conn = get_db()
    team = conn.execute('SELECT payment_screenshot FROM teams WHERE team_id = ?', (team_id,)).fetchone()
    if team and team['payment_screenshot']:
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], team['payment_screenshot'])
        if os.path.exists(filepath):
            os.remove(filepath)
    conn.execute('DELETE FROM teams WHERE team_id = ?', (team_id,))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

@app.route('/api/admin/export')
@admin_required
def export_csv():
    conn = get_db()
    teams = conn.execute('SELECT * FROM teams ORDER BY created_at DESC').fetchall()
    conn.close()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Team ID', 'Team Name', 'Captain', 'Phone', 'Team Size', 'Hometown', 'Payment Status', 'Registered At'])
    for t in teams:
        writer.writerow([t['team_id'], t['team_name'], t['captain_name'], t['phone'],
                         t['team_size'], t['hometown'], t['payment_status'], t['created_at']])

    from flask import Response
    return Response(
        output.getvalue(),
        mimetype='text/csv',
        headers={'Content-Disposition': 'attachment; filename=tournament_teams.csv'}
    )

@app.route('/api/admin/dashboard')
@admin_required
def dashboard():
    conn = get_db()
    total = conn.execute('SELECT COUNT(*) as cnt FROM teams').fetchone()['cnt']
    approved = conn.execute("SELECT COUNT(*) as cnt FROM teams WHERE payment_status='approved'").fetchone()['cnt']
    pending = conn.execute("SELECT COUNT(*) as cnt FROM teams WHERE payment_status='pending'").fetchone()['cnt']
    rejected = conn.execute("SELECT COUNT(*) as cnt FROM teams WHERE payment_status='rejected'").fetchone()['cnt']
    conn.close()
    return jsonify({
        'total': total, 'approved': approved,
        'pending': pending, 'rejected': rejected,
        'slots_remaining': MAX_TEAMS - total, 'max_teams': MAX_TEAMS
    })

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

if __name__ == '__main__':
    init_db()
    print("🏐 Volleyball Tournament Portal running at http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)
