"""Prueba HTTP de integración. Usar únicamente contra una BD de pruebas.
python tests/api_smoke.py http://localhost/canchaYaFrontend
Crea dos usuarios y una reserva persistente; no borra datos existentes.
"""
import http.cookiejar
import json
import sys
import uuid
import urllib.error
import urllib.request

BASE = (sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8088').rstrip('/')

class Cliente:
    def __init__(self):
        self.cookies = http.cookiejar.CookieJar()
        self.http = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.cookies))
        self.token = None

    def pedir(self, ruta, datos=None, token=True):
        headers = {}
        if datos is not None:
            headers['Content-Type'] = 'application/json'
            if token and self.token:
                headers['X-CSRF-Token'] = self.token
        req = urllib.request.Request(BASE + '/api/' + ruta,
            data=json.dumps(datos).encode() if datos is not None else None, headers=headers)
        try:
            res = self.http.open(req)
        except urllib.error.HTTPError as error:
            res = error
        salida = json.load(res)
        if 'csrf_token' in salida:
            self.token = salida['csrf_token']
        return res.status, salida

    def sid(self):
        return next((c.value for c in self.cookies if c.name == 'CANCHAYA_SESSID'), None)

cliente = Cliente()
assert cliente.pedir('mis_reservas.php')[0] == 401
assert cliente.pedir('mis_reservas.php', {'usuario_id': 1})[0] == 401
assert cliente.pedir('csrf.php')[0] == 200
anon_sid = cliente.sid()
email = 'qa-' + uuid.uuid4().hex[:12] + '@example.com'
payload_xss = '<img src=x onerror="window.xss=1">'
registro = {'nombre': payload_xss, 'email': email, 'password': 'Segura123!'}
assert cliente.pedir('registro.php', registro, token=False)[0] == 403
assert cliente.pedir('registro.php', {**registro, 'password': 'a' * 73})[0] == 422
assert cliente.pedir('registro.php', registro)[0] == 201
assert cliente.pedir('registro.php', registro)[0] == 409
assert cliente.pedir('login.php', {'email': email, 'password': 'Incorrecta!'})[0] == 401
assert cliente.pedir('login.php', {'email': "' OR 1=1 --@example.com", 'password': 'Incorrecta!'})[0] == 401
assert cliente.pedir('login.php', registro)[0] == 200
assert cliente.sid() != anon_sid, 'No se renovó el ID de sesión'
status, privado = cliente.pedir('mis_reservas.php')
assert status == 200 and privado['usuario']['nombre'] == payload_xss
assert 'password' not in privado['usuario']
assert privado['reservas'] == []

_, horarios = cliente.pedir('turnos.php')
complejo, turno = next((c, t['hora']) for c, turnos in horarios['turnos'].items() for t in turnos if t['libre'])
reserva = {'complejo': complejo, 'tipo': '5', 'horario': turno, 'telefono': '3761234567',
           'pago': 'debito', 'servicios': [], 'cupon': 'UCP10', 'total': 1, 'usuario_id': 99999}
assert cliente.pedir('mis_reservas.php', reserva, token=False)[0] == 403
assert cliente.pedir('mis_reservas.php', {**reserva, 'servicios': ['inexistente']})[0] == 422
status, guardada = cliente.pedir('mis_reservas.php', reserva)
assert status == 201 and guardada['reserva']['total'] > 1
assert cliente.pedir('mis_reservas.php', reserva)[0] == 409
assert len(cliente.pedir('mis_reservas.php')[1]['reservas']) == 1

otro = Cliente()
otro.pedir('csrf.php')
registro2 = {**registro, 'email': 'qa-' + uuid.uuid4().hex[:12] + '@example.com'}
assert otro.pedir('registro.php', registro2)[0] == 201
assert otro.pedir('login.php', registro2)[0] == 200
assert otro.pedir('mis_reservas.php?usuario_id=' + str(privado['usuario']['id']))[1]['reservas'] == []
assert otro.pedir('mis_reservas.php', reserva)[0] == 409
assert cliente.pedir('logout.php', {})[0] == 200
assert cliente.pedir('mis_reservas.php')[0] == 401
print('PASS: 401, CSRF, BCRYPT/login, sesión renovada, duplicados, aislamiento de usuarios, total del servidor y logout.')
print('Usuarios de prueba creados:', email, registro2['email'])
