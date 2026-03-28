var express = require("express");
var router = express.Router();
var fs = require("fs");
var path = require("path");
var multer = require("multer");
var XLSX = require("xlsx");

let userModel = require("../schemas/users");
let roleModel = require("../schemas/roles");
let cartModel = require("../schemas/carts");
let { CreateAnUserValidator, validatedResult, ModifyAnUser } = require("../utils/validateHandler");
let userController = require("../controllers/users");
let { CheckLogin, CheckRole } = require("../utils/authHandler");
let { generateStrongPassword } = require("../utils/passwordHandler");
let { sendNewUserPasswordEmail } = require("../utils/mailHandler");

const importDir = path.join(process.cwd(), "uploads", "imports");
fs.mkdirSync(importDir, { recursive: true });

const importStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, importDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname || ".xlsx");
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

const excelUpload = multer({
  storage: importStorage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: function (req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const allowedMimeTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
      "application/csv"
    ];

    if (allowedMimeTypes.includes(file.mimetype) || [".xlsx", ".xls", ".csv"].includes(ext)) {
      cb(null, true);
      return;
    }

    cb(new Error("Chi chap nhan file Excel hoac CSV"));
  }
});

async function resolveUserRole() {
  let role = await roleModel.findOne({
    isDeleted: false,
    name: { $regex: /^user$/i }
  });

  if (!role) {
    role = await roleModel.findOne({
      isDeleted: false,
      name: { $in: [/^nguoi dung$/i, /^người dùng$/i] }
    });
  }

  if (!role) {
    role = await roleModel.create({
      name: "user",
      description: "Default role for imported users"
    });
  }

  return role;
}

function normalizeRows(rows) {
  return rows
    .map(function (row) {
      return {
        username: String(row.username || "").trim(),
        email: String(row.email || "").trim().toLowerCase()
      };
    })
    .filter(function (row) {
      return row.username || row.email;
    });
}

router.post("/import", excelUpload.single("file"), async function (req, res) {
  const cleanupFile = function () {
    try {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    } catch (err) {
      console.log("Khong the xoa file tam:", err.message);
    }
  };

  if (!req.file) {
    return res.status(400).send({ message: "Vui long upload file Excel vao field file" });
  }

  try {
    const workbook = XLSX.readFile(req.file.path, {
      cellFormula: true,
      cellNF: false,
      cellText: true
    });

    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = normalizeRows(XLSX.utils.sheet_to_json(firstSheet, { defval: "" }));

    if (!rows.length) {
      cleanupFile();
      return res.status(400).send({ message: "File khong co du lieu hop le" });
    }

    const role = await resolveUserRole();
    const results = [];

    for (const row of rows) {
      const rowResult = {
        username: row.username,
        email: row.email,
        role: role.name
      };

      if (!row.username || !row.email) {
        rowResult.status = "failed";
        rowResult.message = "Thieu username hoac email";
        results.push(rowResult);
        continue;
      }

      const duplicatedUser = await userModel.findOne({
        isDeleted: false,
        $or: [{ username: row.username }, { email: row.email }]
      });

      if (duplicatedUser) {
        rowResult.status = "skipped";
        rowResult.message = "Username hoac email da ton tai";
        results.push(rowResult);
        continue;
      }

      const plainPassword = generateStrongPassword(16);

      try {
        const newUser = await userController.CreateAnUser(
          row.username,
          plainPassword,
          row.email,
          role._id,
          undefined,
          "",
          undefined,
          true,
          0
        );

        await cartModel.create({
          user: newUser._id
        });

        try {
          const mailInfo = await sendNewUserPasswordEmail({
            to: row.email,
            username: row.username,
            password: plainPassword
          });

          rowResult.status = "success";
          rowResult.message = "Tao user va gui mail thanh cong";
          rowResult.mail = {
            accepted: mailInfo.accepted,
            rejected: mailInfo.rejected,
            messageId: mailInfo.messageId
          };
        } catch (mailError) {
          rowResult.status = "mail_failed";
          rowResult.message = `Da tao user nhung gui mail that bai: ${mailError.message}`;
        }
      } catch (error) {
        rowResult.status = "failed";
        rowResult.message = error.message;
      }

      results.push(rowResult);
    }

    cleanupFile();

    const summary = results.reduce(
      function (acc, item) {
        acc.total += 1;
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      },
      { total: 0, success: 0, skipped: 0, failed: 0, mail_failed: 0 }
    );

    res.send({
      message: "Import user hoan tat",
      summary,
      results
    });
  } catch (error) {
    cleanupFile();
    res.status(400).send({ message: error.message });
  }
});

router.get("/", CheckLogin, CheckRole("ADMIN"), async function (req, res, next) {
  let users = await userController.GetAllUser();
  res.send(users);
});

router.get("/:id", CheckLogin, CheckRole("ADMIN", "MODERATOR"), async function (req, res, next) {
  try {
    let result = await userModel.find({ _id: req.params.id, isDeleted: false });
    if (result.length > 0) {
      res.send(result);
    } else {
      res.status(404).send({ message: "id not found" });
    }
  } catch (error) {
    res.status(404).send({ message: "id not found" });
  }
});

router.post("/", CreateAnUserValidator, validatedResult, async function (req, res, next) {
  try {
    let newItem = await userController.CreateAnUser(
      req.body.username,
      req.body.password,
      req.body.email,
      req.body.role,
      undefined,
      req.body.fullName,
      req.body.avatarUrl,
      req.body.status,
      req.body.loginCount
    );

    let saved = await userModel.findById(newItem._id);
    res.send(saved);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

router.put("/:id", ModifyAnUser, validatedResult, async function (req, res, next) {
  try {
    let id = req.params.id;
    let updatedItem = await userModel.findByIdAndUpdate(id, req.body, { new: true });

    if (!updatedItem) return res.status(404).send({ message: "id not found" });

    let populated = await userModel.findById(updatedItem._id);
    res.send(populated);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

router.delete("/:id", async function (req, res, next) {
  try {
    let id = req.params.id;
    let updatedItem = await userModel.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );

    if (!updatedItem) {
      return res.status(404).send({ message: "id not found" });
    }

    res.send(updatedItem);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

module.exports = router;