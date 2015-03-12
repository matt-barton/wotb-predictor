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
    },

    all: {
      map: function(doc) {
        if (doc.type && doc.type == 'user' && !doc.disabled) {
          emit(doc._id, doc);
        }
      }
    },

    withPseudonymns: {
      map: function(doc) {
        if (doc.type && doc.type == 'user' &&
          doc.pseudonyms && Array.isArray(doc.pseudonyms) && doc.pseudonyms.length > 0) {
          emit(doc._id, doc);
        }
      }
    }
  }
};