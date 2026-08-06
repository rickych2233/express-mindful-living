const Role = require("../models/Role");
const Permission = require("../models/Permission");

class RoleController {
  static async list(req, res) {
    try {
      const roles = await Role.findAll();
      return res.status(200).json({
        message: "data roles berhasil diambil",
        roles,
      });
    } catch (error) {
      console.error("GET_ROLES_ERROR", error);
      return res.status(500).json({ message: "terjadi kesalahan server" });
    }
  }

  static async getById(req, res) {
    try {
      const { id } = req.params;
      const role = await Role.findById(id);
      if (!role) {
        return res.status(404).json({ message: "role tidak ditemukan" });
      }
      return res.status(200).json({ message: "data role berhasil diambil", role });
    } catch (error) {
      console.error("GET_ROLE_ERROR", error);
      return res.status(500).json({ message: "terjadi kesalahan server" });
    }
  }

  static async create(req, res) {
    try {
      const { name, description = "", permissionKeys = [] } = req.body;
      if (!name || !String(name).trim()) {
        return res.status(400).json({ message: "name role harus diisi" });
      }

      const existing = await Role.findByName(String(name).trim());
      if (existing) {
        return res.status(409).json({ message: "nama role sudah digunakan" });
      }

      const role = await Role.create({
        name: String(name).trim(),
        description,
        is_system: false,
        permissionKeys,
      });

      return res.status(201).json({ message: "role berhasil dibuat", role });
    } catch (error) {
      console.error("CREATE_ROLE_ERROR", error);
      return res.status(500).json({ message: "terjadi kesalahan server" });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const { name, description } = req.body;

      const role = await Role.findById(id);
      if (!role) {
        return res.status(404).json({ message: "role tidak ditemukan" });
      }

      if (name !== undefined && String(name).trim() && String(name).trim() !== role.name) {
        const duplicate = await Role.findByName(String(name).trim());
        if (duplicate && duplicate.id !== parseInt(id, 10)) {
          return res.status(409).json({ message: "nama role sudah digunakan oleh role lain" });
        }
      }

      const updated = await Role.update(id, { name, description });
      const refreshed = await Role.findById(id);
      return res.status(200).json({ message: "role berhasil diupdate", role: refreshed || updated });
    } catch (error) {
      console.error("UPDATE_ROLE_ERROR", error);
      return res.status(500).json({ message: "terjadi kesalahan server" });
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;
      const role = await Role.findById(id);
      if (!role) {
        return res.status(404).json({ message: "role tidak ditemukan" });
      }
      if (role.is_system) {
        return res.status(400).json({ message: "role sistem tidak dapat dihapus" });
      }

      await Role.delete(id);
      return res.status(200).json({ message: "role berhasil dihapus" });
    } catch (error) {
      console.error("DELETE_ROLE_ERROR", error);
      return res.status(500).json({ message: "terjadi kesalahan server" });
    }
  }

  static async setPermissions(req, res) {
    try {
      const { id } = req.params;
      const { permissionKeys = [] } = req.body;

      const role = await Role.findById(id);
      if (!role) {
        return res.status(404).json({ message: "role tidak ditemukan" });
      }

      const keys = Array.isArray(permissionKeys) ? permissionKeys.filter((k) => typeof k === "string") : [];
      const refreshed = await Role.setPermissions(id, keys);
      return res.status(200).json({ message: "permission role berhasil diperbarui", role: refreshed });
    } catch (error) {
      console.error("SET_ROLE_PERMISSIONS_ERROR", error);
      return res.status(500).json({ message: "terjadi kesalahan server" });
    }
  }

  static async setUsers(req, res) {
    try {
      const { id } = req.params;
      const { userIds = [] } = req.body;

      const role = await Role.findById(id);
      if (!role) {
        return res.status(404).json({ message: "role tidak ditemukan" });
      }

      const ids = Array.isArray(userIds) ? userIds : [];
      const refreshed = await Role.setUsers(id, ids);
      return res.status(200).json({ message: "user role berhasil diperbarui", role: refreshed });
    } catch (error) {
      console.error("SET_ROLE_USERS_ERROR", error);
      return res.status(500).json({ message: "terjadi kesalahan server" });
    }
  }

  static async assignUser(req, res) {
    try {
      const { id } = req.params;
      const { userId, userIds } = req.body;

      const role = await Role.findById(id);
      if (!role) {
        return res.status(404).json({ message: "role tidak ditemukan" });
      }

      const ids = userIds ? userIds : userId !== undefined ? [userId] : [];
      const refreshed = await Role.addUsers(id, ids);
      return res.status(200).json({ message: "user berhasil ditambahkan ke role", role: refreshed });
    } catch (error) {
      console.error("ASSIGN_ROLE_USER_ERROR", error);
      return res.status(500).json({ message: "terjadi kesalahan server" });
    }
  }

  static async removeUser(req, res) {
    try {
      const { id, userId } = req.params;

      const role = await Role.findById(id);
      if (!role) {
        return res.status(404).json({ message: "role tidak ditemukan" });
      }

      const refreshed = await Role.removeUser(id, userId);
      return res.status(200).json({ message: "user berhasil dihapus dari role", role: refreshed });
    } catch (error) {
      console.error("REMOVE_ROLE_USER_ERROR", error);
      return res.status(500).json({ message: "terjadi kesalahan server" });
    }
  }

  static async getPermissionsCatalog(req, res) {
    try {
      const sections = await Permission.findAllGroupedBySection();
      return res.status(200).json({ message: "data permission berhasil diambil", sections });
    } catch (error) {
      console.error("GET_PERMISSIONS_ERROR", error);
      return res.status(500).json({ message: "terjadi kesalahan server" });
    }
  }
}

module.exports = RoleController;
