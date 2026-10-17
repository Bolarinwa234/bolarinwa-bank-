const express = require("express");

const app = express();
const port = 3100;


app.use(express.json());

const students = [];

// Create Student Database
app.post("/createstudentdatabase", (req, res) => {

  const { name, age, gender } = req.body;

  const newStudent = {
    id: students.length + 1,
    name,
    age,
    gender
};

  students.push(newStudent);

  res.status(201).json(newStudent);
});

// Get All Studentsdatabase
app.get("/getallstudentsdatabase", (req, res) => {
  res.json(students);
});

// Get a student by ID
app.get("/getstudentdatabase/:id", (req, res) => {
  const studentId = parseInt(req.params.id);
  const student = students.find(student => student.id === studentId);

  if (!student) {
    return res.status(404).json({ error: "Student not found" });
  }   

  res.json(student);
});

// Update a student
app.put("/student/:id", (req, res) => {
    const id = Number(req.params.id);

    const student = students.find(student => student.id === id);

    if (!student) {
        return res.status(404).json({
            message: "Student not found"
        });
    }

    const { name, age, gender } = req.body;

    student.name = name || student.name;
    student.age = age || student.age;
    student.gender = gender || student.gender;

    res.status(200).json({
        message: "Student updated successfully",
        student
    });
});


// Delete a student
app.delete("/student/:id", (req, res) => {
    const id = Number(req.params.id);

    const studentIndex = students.findIndex(student => student.id === id);

    if (studentIndex === -1) {
        return res.status(404).json({
            message: "Student not found"
        });
    }

    const deletedStudent = students.splice(studentIndex, 1);

    res.json({
        message: "Student deleted successfully",
        deletedStudent: deletedStudent[0]
    });
});



app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});