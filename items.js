/*
  Items
*/

var MongoClient = require('mongodb').MongoClient,
    assert = require('assert');

function ItemDAO(database) {
    "use strict";

    this.db = database;

    this.getCategories = function(callback) {
        "use strict";

        /*
         *
         * Aggregation query on the "item" collection to return the total number
         * of items in each category. The documents in the array output contains
         * fields for "_id" and "num". In addition, it includes a document for
         * category "All" in the array of categories passed to the callback. 
         * Categories are organized in alphabetical order.
         *
         */
        var categories = [];
        var category = {_id: "All", num: 9999};
        categories.push(category);
        var total = 0
        var cursor = this.db.collection('item').aggregate([
            {$group: {_id: "$category", num: {$sum: 1}}},
            {$sort: {_id: 1}}
        ]);
        // use cursor.each() to walk thru docs
        cursor.each(function(err, doc) {
            assert.equal(null, err);
            if (doc) {
                //console.log(doc);
                total = total + doc.num;
                categories.push(doc);
            } else {  // last cursor always empty
                console.log('total items: ' + total);
                // this is when to update 'All'.num & do the call back
                categories[0].num = total;
                callback(categories);
            }
        });

        /* or use cursor.toArray() then walk thru elements
        cursor.toArray(function(err, docs) {
            assert.equal(null, err);
            for (var i=0, len = docs.length; i<len; ++i) {
                var doc = docs[i];
                //console.log(doc);
                total = total + doc.num;
                categories.push(doc);
            }
            console.log('total items: ' + total);
            categories[0].num = total;
            callback(categories);
        });
        */
    }

    this.getItems = function(category, page, itemsPerPage, callback) {
        "use strict";

        /*
         *
         * Query on the "item" collection to select only the items that should
         * be displayed for a particular page of a given category. Items are
         * sorted in ascending order based on the _id field.
         *
         */
        //console.log('getItems category: ' + category);
        var query = (category == 'All') ? {} : {category: category};
        var cursor = this.db.collection('item').find(query)
                                               .sort({_id: 1})
                                               .skip(page*itemsPerPage)
                                               .limit(itemsPerPage);
        cursor.toArray(function(err, docs) {
            assert.equal(null, err);
            var pageItems = [];
            for (var i=0, len = docs.length; i<len; ++i) {
                var doc = docs[i];
                //console.log(doc);
                pageItems.push(doc);
            }
            console.log('items for ' + category + ' in page ' +
                        page + ': ' + pageItems.length);
            callback(pageItems);
        });

    }

    this.getNumItems = function(category, callback) {
        "use strict";

        //var numItems = 0;

        /*
         *
         * Query that determines the number of items in a category and pass the
         * count to the callback function.
         *
         */
        //console.log('getNumItems category: ' + category);
        // use getItems().length
        this.getItems(category, 0, 9999, function(docs) {
            callback(docs.length)
        });

        /* or use find().count()
        var query = (category == 'All') ? {} : {category: category};
        var cursor = this.db.collection('item').find(query)
        cursor.count(function(err, cnt) {
            assert.equal(null, err);
            console.log('total items for ' + category + ': ' + cnt);
            callback(cnt);
        });
        */
    }

    this.searchItems = function(query, page, itemsPerPage, callback) {
        "use strict";

        /*
         *
         * Query to perform a text search against the "item" collection, sort
         * the results in ascending order based on the _id field. Select only
         * the items to be displayed for the given page.
         *
         * It depends on a text index: need create a SINGLE text index on title,
         * slogan, and description (e.g. in the mongo shell).
         *
         */
        console.log('searchItems query string: ' + query);
        var searchqry = (query == '') ? {} : {$text: {$search: 'leaf'}};
        var cursor = this.db.collection('item').find(searchqry)
                                               .sort({_id: 1})
                                               .skip(page*itemsPerPage)
                                               .limit(itemsPerPage);
        cursor.toArray(function(err, docs) {
            assert.equal(null, err);
            var items = [];
            for (var i=0, len = docs.length; i<len; ++i) {
                var doc = docs[i];
                //console.log(doc);
                items.push(doc);
            }
            console.log('items for search "' + query + '" in page ' +
                        page + ': ' + items.length);
            callback(items);
        });

    }

    this.getNumSearchItems = function(query, callback) {
        "use strict";

        /*
        *
        * Count the number of items in the "item" collection matching a text
        * search. Pass the count to the callback function.
        *
        */
        //console.log('getNumSearchItems query: ' + query);
        var searchqry = (query == '') ? {} : {$text: {$search: 'leaf'}};
        var cursor = this.db.collection('item').find(searchqry)
        cursor.count(function(err, cnt) {
            assert.equal(null, err);
            console.log('total items for "' + query + '": ' + cnt);
            callback(cnt);
        });

    }

    this.getItem = function(itemId, callback) {
        "use strict";

        /*
         *
         * Query the "item" collection by _id and pass the matching item to the
         * callback function.
         *
         */
        console.log('getItem itemId: ' + itemId);
        var query = (itemId == '') ? {_id: 0} : {_id: itemId};
        var coll = this.db.collection('item');
        coll.findOne(query, {}, function(err, doc) {
            assert.equal(null, err);
            if (!doc) doc = {};
            //console.log(doc);
            if (!doc.reviews) doc.reviews = [];
            for (var i=0, len=doc.reviews.length; i<len; ++i) {
                 var rev = doc.reviews[i]
                 if (!rev.name) rev.name = 'Anonymous';
                 if (!rev.comment) rev.comment = 'n/a';
            }
            callback(doc);
        });

    }

    this.getRelatedItems = function(itemId, callback) {
        "use strict";

        /*
         *
         * This can be improved to fatch items not in display, pass itemId
         *
         */
        this.db.collection("item").find({_id: {$ne: itemId}},
                                        {_id: 1, img_url: 1})
            .limit(4)
            .toArray(function(err, relatedItems) {
                assert.equal(null, err);
                callback(relatedItems);
            });
    };

    this.addReview = function(itemId, comment, name, stars, callback) {
        "use strict";

        /*
         *
         * Update the appropriate document in the "item" collection with a new
         * review. Reviews are stored as an array value for the key "reviews".
         * Each review has the fields: "name", "comment", "stars", and "date".
         *
         */
        console.log('addReview itemId: ' + itemId);
        var reviewDoc = {
            name: name,
            comment: comment,
            stars: stars,
            date: Date.now()
        }
        //console.log(reviewDoc);

        //doc.reviews = [reviewDoc];
        var coll = this.db.collection('item');
        /* run coll.updateOne() then getItem()
        coll.updateOne({_id: itemId}, {$push: {reviews: reviewDoc}});

        this.getItem(itemId, function(doc) {
            callback(doc);
        });
        */
        // Or run findOne() and save doc
        coll.findOne({_id: itemId}, {}, function(err, doc) {
            assert.equal(null, err);
            if (!doc.reviews) doc.reviews = [];
            doc.reviews.push(reviewDoc);
            coll.save(doc, {}, function(err, result) {
                assert.equal(null, err);
                assert.equal(1, result.result.n);
            });
            callback(doc);
        });
        //
    }

}


module.exports.ItemDAO = ItemDAO;
