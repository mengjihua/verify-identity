import os
import random
import string
import threading
import time
from flask import Flask, render_template, request, jsonify
from identity import identify

app = Flask(__name__)

CAPTCHA_LEN = 12
_captcha_lock = threading.Lock()
_current_captcha = ''
_captcha_thread = None
_captcha_started = False


def _random_captcha() -> str:
    # 混合大小写字母、数字与少量汉字，长度 12，终端打印供授权人分发
    han = '萨嘎是个大巴萨发对方巴萨恐惧拜三拜把控不过就是人特好'
    pool = string.ascii_letters + string.digits + han
    return ''.join(random.choice(pool) for _ in range(CAPTCHA_LEN))


def _set_new_captcha() -> str:
    global _current_captcha
    with _captcha_lock:
        _current_captcha = _random_captcha()
        print(f"[CAPTCHA] {time.strftime('%Y-%m-%d %H:%M:%S')} -> {_current_captcha}")
        return _current_captcha


def _captcha_refresher():
    while True:
        time.sleep(600)  # 10 分钟
        _set_new_captcha()


def _ensure_captcha_thread():
    global _captcha_thread
    if _captcha_thread and _captcha_thread.is_alive():
        return
    _set_new_captcha()
    _captcha_thread = threading.Thread(target=_captcha_refresher, daemon=True)
    _captcha_thread.start()


@app.route('/')
def index():
    return render_template('index.html')


@app.before_request
def _bootstrap_captcha():
    # Flask 3.x removed before_first_request; gate with flag to avoid repeated starts
    global _captcha_started
    if _captcha_started:
        return
    if os.environ.get('WERKZEUG_RUN_MAIN') == 'true' or not os.environ.get('FLASK_RUN_FROM_CLI'):
        _ensure_captcha_thread()
        _captcha_started = True


@app.route('/api/identify', methods=['POST'])
def api_identify():
    data = request.get_json(silent=True) or {}
    input_text = str(data.get('input', '')).strip()
    captcha_text = str(data.get('captcha', '')).strip()

    if not input_text:
        return jsonify({'error': '请输入名字或别名'}), 400

    if not captcha_text:
        return jsonify({'error': '请输入验证码'}), 400
    with _captcha_lock:
        expected = _current_captcha
    if not expected or captcha_text != expected:
        return jsonify({'error': '验证码错误或已过期'}), 400

    label, method = identify(input_text)
    return jsonify({'input': input_text, 'result': label, 'method': method})

if __name__ == '__main__':
    _ensure_captcha_thread()
    port = int(os.environ.get('PORT', '5000'))
    app.run(debug=True, host='0.0.0.0', port=port)
