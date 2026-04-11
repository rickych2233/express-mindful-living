const bcrypt = require("bcryptjs");
const User = require("../models/User");

class UserController {
  static async createUser(req, res) {
    try {
      const { name, email, password } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({
          message: "name, email, dan password harus diisi",
        });
      }

      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          message: "email sudah terdaftar",
        });
      }

      const saltRounds = 10;
      const password_hash = await bcrypt.hash(password, saltRounds);

      const newUser = await User.create({
        name,
        email,
        password_hash,
      });

      return res.status(201).json({
        message: "user berhasil dibuat",
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          donation_amount: newUser.donation_amount,
          created_at: newUser.created_at,
        },
      });
    } catch (error) {
      console.error("CREATE_USER_ERROR", error);
      return res.status(500).json({
        message: "terjadi kesalahan server",
      });
    }
  }

  static async getAllUsers(req, res) {
    try {
      const users = await User.findAll();

      return res.status(200).json({
        message: "data users berhasil diambil",
        users,
      });
    } catch (error) {
      console.error("GET_USERS_ERROR", error);
      return res.status(500).json({
        message: "terjadi kesalahan server",
      });
    }
  }

  static async getUserById(req, res) {
    try {
      const { id } = req.params;
      
      const user = await User.findById(id);
      
      if (!user) {
        return res.status(404).json({
          message: "user tidak ditemukan",
        });
      }

      return res.status(200).json({
        message: "data user berhasil diambil",
        user,
      });
    } catch (error) {
      console.error("GET_USER_ERROR", error);
      return res.status(500).json({
        message: "terjadi kesalahan server",
      });
    }
  }

  static async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { name, email, password, active } = req.body;

      if (!name || !email) {
        return res.status(400).json({
          message: "name dan email harus diisi",
        });
      }

      const existingUser = await User.findById(id);
      if (!existingUser) {
        return res.status(404).json({
          message: "user tidak ditemukan",
        });
      }

      const userWithEmail = await User.findByEmail(email);
      if (userWithEmail && userWithEmail.id !== parseInt(id)) {
        return res.status(409).json({
          message: "email sudah digunakan oleh user lain",
        });
      }

      let updateData = { name, email };
      
      if (password) {
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);
        updateData.password_hash = password_hash;
      }
      
      if (active !== undefined) {
        updateData.active = active;
      }

      const updatedUser = await User.update(id, updateData);

      return res.status(200).json({
        message: "user berhasil diupdate",
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          donation_amount: updatedUser.donation_amount,
          active: updatedUser.active,
          created_at: updatedUser.created_at,
        },
      });
    } catch (error) {
      console.error("UPDATE_USER_ERROR", error);
      return res.status(500).json({
        message: "terjadi kesalahan server",
      });
    }
  }

  static async deleteUser(req, res) {
    try {
      const { id } = req.params;
      
      const deletedUser = await User.delete(id);
      
      if (!deletedUser) {
        return res.status(404).json({
          message: "user tidak ditemukan",
        });
      }

      return res.status(200).json({
        message: "user berhasil dihapus",
      });
    } catch (error) {
      console.error("DELETE_USER_ERROR", error);
      return res.status(500).json({
        message: "terjadi kesalahan server",
      });
    }
  }

  static async toggleUserActive(req, res) {
    try {
      const { id } = req.params;
      
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          message: "user tidak ditemukan",
        });
      }

      const updatedUser = await User.toggleActive(id);

      return res.status(200).json({
        message: `status user berhasil diubah menjadi ${updatedUser.active ? 'aktif' : 'tidak aktif'}`,
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          donation_amount: updatedUser.donation_amount,
          active: updatedUser.active,
          created_at: updatedUser.created_at,
        },
      });
    } catch (error) {
      console.error("TOGGLE_USER_ACTIVE_ERROR", error);
      return res.status(500).json({
        message: "terjadi kesalahan server",
      });
    }
  }

  static async setUserActive(req, res) {
    try {
      const { id } = req.params;
      const { active } = req.body;
      
      if (active === undefined) {
        return res.status(400).json({
          message: "status active harus diisi",
        });
      }

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          message: "user tidak ditemukan",
        });
      }

      const updatedUser = await User.setActive(id, active);

      return res.status(200).json({
        message: `status user berhasil diubah menjadi ${updatedUser.active ? 'aktif' : 'tidak aktif'}`,
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          donation_amount: updatedUser.donation_amount,
          active: updatedUser.active,
          created_at: updatedUser.created_at,
        },
      });
    } catch (error) {
      console.error("SET_USER_ACTIVE_ERROR", error);
      return res.status(500).json({
        message: "terjadi kesalahan server",
      });
    }
  }
}

module.exports = UserController;