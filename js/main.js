//Parse.initialize("APPLICATION_ID", "JAVASCRIPT_KEY");
Parse.initialize("tm4OiR7E8zVPm6IJvlAclFxfUdWct3QyidSmveDQ", "4dMCCtPUjmpacMw0JCKqhrucl9lyG4FngHkUdaCB");

var TestObject = Parse.Object.extend("TestObject");
var testObject = new TestObject();
testObject.save({foo: "bar"}, {
    success: function(object) {
        $(".success").show();
    },
    error: function(model, error) {
        $(".error").show();
    }
});