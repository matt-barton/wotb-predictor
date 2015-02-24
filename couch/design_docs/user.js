module.exports = {
  _id: "_design/user",
  language: "javascript",

  views: {

    byUsername: {

      map: function(doc) {
        if (doc.type && doc.type == 'user' && !doc.disabled) {
          emit(doc.username.toLowerCase(), doc);
        }
      }
    },

    predictionsByUserId: {

      map: function(doc) {
        if (doc.type && doc.type == 'user' && !doc.disabled) {
          emit(doc._id, doc.predictions);
        }
      }
    }
  }
};