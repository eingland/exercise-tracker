const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

var mongoose = require('mongoose'),
    Schema = mongoose.schema,
    autoIncrement = require('mongoose-auto-increment');
var connection = mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track' );

autoIncrement.initialize(connection);

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

var ExerciseSchema = new mongoose.Schema({
  description: 'string',
  duration: 'number',
  date: 'date'
});

var UserSchema = new mongoose.Schema({
  username: 'string' ,
  exercises: [ExerciseSchema]
});

UserSchema.plugin(autoIncrement.plugin, 'ExerciseUser');
var ExerciseUser = connection.model('ExerciseUser', UserSchema);


app.post("/api/exercise/new-user", function (req, res) {
  console.log(req.params.username);
  var user = new ExerciseUser({username: req.body.username, exercises: []});
  user.save(function(err, result) {
    if (err) throw err;
    res.json({username: result.username, id: result._id});
  });
});

app.get("/api/exercise/users", function (req, res) {
  ExerciseUser.find({}).then(function (users) {
     res.send(users);
  });
});

app.post("/api/exercise/add", function (req, res) {
  ExerciseUser.findOneAndUpdate({_id: req.body.userId}, 
                                         {$push: {exercises: {description: req.body.description, 
                                                              duration: req.body.duration, 
                                                              date: req.body.date || new Date().toISOString().slice(0, 10)}
                                                 }
                                         }, 
                                         {new: true}, 
                                         function(err, doc) {
                                            if (err) throw err;
                                            res.send(doc);
                                         }
                               );
});

app.get("/api/exercise/log", function (req, res) {
  ExerciseUser.findOne({_id: req.query.userId}, function (err, user) {
    if (err) throw err;
    var exercises = user.exercises;
    if (req.query.from) {
      exercises = exercises.filter(x => {return new Date(x.date).getTime() >= new Date(req.query.from).getTime()});
    }
    
    if (req.query.to) {
      exercises = exercises.filter(x => {return new Date(x.date).getTime() <= new Date(req.query.to).getTime()});
    }
    
    if (req.query.limit) {
      exercises = exercises.slice(0, req.query.limit);
    }
    
    res.send({log: exercises, total: exercises.length});
  });
});

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
