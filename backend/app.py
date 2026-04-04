from flask import Flask, request
from flask_cors import CORS

from routes.companies import companies_bp
from routes.courses import courses_bp

app = Flask(__name__)
CORS(app)

# Новое правильное решение для Flask 2.3+
app.json.ensure_ascii = False

# Роуты
app.register_blueprint(companies_bp, url_prefix="/api/companies")
app.register_blueprint(courses_bp, url_prefix="/api/courses")

@app.before_request
def log_request():
    print(f"{request.method} {request.path}")

if __name__ == "__main__":
    app.run(debug=True, port=8080)