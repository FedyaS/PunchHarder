from flask import Flask
from flask_cors import CORS

app = Flask(__name__)
CORS(app)


@app.route("/api/ping")
def ping():
    return {"message": "pong from flask"}


if __name__ == "__main__":
    app.run(debug=True, port=4000)
