module.exports = {
  _id: "_design/fixtures",
  language: "javascript",

  views: {

    currentSeason: {

      map: function(doc) {
        if (doc.type && doc.type == 'season' && doc.current) {
          emit(doc.name, doc);
        }
      }
    },

    notCurrentSeasons: {

      map: function(doc) {
        if (doc.type && doc.type == 'season' && !doc.current) {
          emit(doc.name, doc);
        }
      }
    },

    byId: {

      map: function(doc) {
        if (doc.type && doc.type == 'season') {
          emit(doc._id, doc);
        }
      }
    },

    allSeasonNames: {

      map: function(doc) {
        if (doc.type && doc.type == 'season') {
          emit(doc._id, doc.name);
        }
      }
    }
  }
};