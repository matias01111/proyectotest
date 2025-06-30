const pool = require('../db/db');
const bcrypt = require('bcrypt');
const path = require('path');
const { DateTime } = require('luxon');

exports.loginVista = (req, res) => {
  res.render('adminLogin', { error: null });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const result = await pool.query('SELECT * FROM usuario WHERE email = $1 AND role = $2', [email, 'admin']);
  if (result.rows.length === 0) {
    return res.render('adminLogin', { error: 'Usuario o contraseña incorrectos.' });
  }
  const admin = result.rows[0];
  const match = await bcrypt.compare(password, admin.password_hash);
  if (!match) {
    return res.render('adminLogin', { error: 'Usuario o contraseña incorrectos.' });
  }
  req.session.userId = admin.id;
  req.session.username = admin.username;
  req.session.role = admin.role;
  req.session.email = admin.email;
  res.redirect('/admin/dashboard');
};

exports.dashboard = async (req, res) => {
  const [{ count: alumnos }] = (await pool.query("SELECT COUNT(*) FROM usuario WHERE role = 'alumno'")).rows;
  const [{ count: profesores }] = (await pool.query("SELECT COUNT(*) FROM usuario WHERE role = 'profesor'")).rows;
  const [{ count: mensajes }] = (await pool.query("SELECT COUNT(*) FROM contacto")).rows;
  res.render('adminDashboard', { alumnos, profesores, mensajes, isAdmin: true });
};

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

exports.mensajes = async (req, res) => {
  const mensajes = (await pool.query(`
    SELECT c.*, u.username, u.email
    FROM contacto c
    LEFT JOIN usuario u ON u.id = c.usuario_id
    ORDER BY c.fecha DESC
  `)).rows.map(m => ({
    ...m,
    fechaString: capitalizeFirst(
      DateTime.fromJSDate(new Date(m.fecha)).setLocale('es').toFormat('cccc d/LL/yyyy HH:mm')
    )
  }));
  res.render('adminMensajes', { mensajes, isAdmin: true });
};

exports.usuarios = async (req, res) => {
  const alumnos = (await pool.query("SELECT id, username, email FROM usuario WHERE role = 'alumno'")).rows;
  const profesores = (await pool.query("SELECT id, username, email FROM usuario WHERE role = 'profesor'")).rows;
  res.render('adminUsuarios', { alumnos, profesores, isAdmin: true });
};

exports.perfilVista = async (req, res) => {
  const admin = (await pool.query('SELECT username, email, foto FROM usuario WHERE id = $1', [req.session.userId])).rows[0];
  res.render('adminPerfil', { usuario: admin, isAdmin: true });
};

exports.perfilEditar = async (req, res) => {
  const { username, email, password, fotoActual } = req.body;
  let fotoPath = fotoActual || null;
  if (req.file) {
    fotoPath = '/uploads/' + req.file.filename;
  }
  let query, params;
  if (password && password.trim() !== '') {
    const hashed = await bcrypt.hash(password, 10);
    query = 'UPDATE usuario SET username = $1, email = $2, password = $3, foto = $4 WHERE id = $5';
    params = [username, email, hashed, fotoPath, req.session.userId];
  } else {
    query = 'UPDATE usuario SET username = $1, email = $2, foto = $3 WHERE id = $4';
    params = [username, email, fotoPath, req.session.userId];
  }
  await pool.query(query, params);
  res.redirect('/admin/perfil/editar?guardado=1');
};

exports.eliminarMensaje = async (req, res) => {
  await pool.query('DELETE FROM contacto WHERE id = $1', [req.params.id]);
  res.redirect('/admin/mensajes');
};

exports.eliminarUsuario = async (req, res) => {
  await pool.query('DELETE FROM usuario WHERE id = $1', [req.params.id]);
  const alumnos = (await pool.query("SELECT id, username, email FROM usuario WHERE role = 'alumno'")).rows;
  const profesores = (await pool.query("SELECT id, username, email FROM usuario WHERE role = 'profesor'")).rows;
  res.render('adminUsuarios', { alumnos, profesores, isAdmin: true, exito: 'Usuario eliminado correctamente.' });
};