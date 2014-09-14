module.exports = {
  _id: "_design/fixtures",

  views: {

    currentSeason: {

      map: function(doc) {
        if (doc.type && doc.type == 'season' && doc.current) {
          emit(doc.name, doc);
        }
      },

      reduce: null
    },

    notCurrentSeasons: {

      map: function(doc) {
        if (doc.type && doc.type == 'season' && !doc.current) {
          emit(doc.name, doc);
        }
      },

      reduce: null
    },

    byId: {

      map: function(doc) {
        if (doc.type && doc.type == 'season') {
          emit(doc._id, doc);
        }
      },

      reduce: null
    },

    allSeasonNames: {

      map: function(doc) {
        if (doc.type && doc.type == 'season') {
          emit(doc._id, doc.name);
        }
      },

      reduce: null
    }


  }
};