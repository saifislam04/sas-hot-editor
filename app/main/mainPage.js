angular.module('myApp.main', ['ngRoute', 'dynamicHandsontable'])

.config([
  '$routeProvider',
  function ($routeProvider) {
    $routeProvider.when('/', {
      templateUrl: 'main/mainPage.html',
      controller: 'MainCtrl'
    });
  }
])

.controller('SideCtrl', [
  '$scope',
  'sasAdapter',
  function($scope, sasAdapter) {
    var tablesMap = {};
    // $scope.tableInfo = {};
    $scope.libs = [];
    $scope.tables = [];

    $scope.$watch('sideData.library', function(newValue) {
      //moved to next event loop tick with timeout
      //setting timeout enables the selected item to finish animation first and then update the Tables select
      setTimeout(function() {
        $scope.tables = tablesMap[newValue];
      }, 0);

      //deselect table if it doesn't exist in sub array
      if(tablesMap[newValue] && tablesMap[newValue].indexOf($scope.sideData.table) === -1) {
        $scope.sideData.table = undefined;
      }
    });

    $scope.$watch('sideData.table', function() {
      if(!$scope.sideData.table) {
        return;
      }
      var table = sasAdapter.createTable([
        {libname: $scope.sideData.library, memname: $scope.sideData.table}
      ], 'memberDetails');

      sasAdapter.call('/Apps/tableEditor/getMemberDetails', table).then(function(res) {
        $scope.tableInfo = res.memInfo[0];
      }, function(err) {
        alert(err);
      });
    });

    sasAdapter.call('/Apps/tableEditor/startupService').then(function(res) {
      res.libsmems.forEach(function(lib) {
        if($scope.libs.indexOf(lib.LIBNAME) === -1) {
          $scope.libs.push(lib.LIBNAME);
        }
        //create sub array if it doesn't exist
        if(!tablesMap[lib.LIBNAME]) {
          tablesMap[lib.LIBNAME] = [];
        }
        if(tablesMap[lib.LIBNAME].indexOf(lib.MEMNAME) === -1) {
          tablesMap[lib.LIBNAME].push(lib.MEMNAME);
        }
      });
    }, function(err) {
      alert(err);
    });
  }
])

.controller('MainCtrl', [
  '$scope',
  'sasAdapter',
  '$rootScope',
  '$mdToast',
  function ($scope, sasAdapter, $rootScope, $mdToast) {
    $scope.loading = false;
    $scope.sideData = {}; //used in child scope of SideCtrl
    var table;

    var toast = $mdToast.build({
      hideDelay: 1800,
      position: 'bottom right'
    });

    $scope.onHandsontableError = function(msg) {
      toast.template('<md-toast class="error"><div>' + msg +'</div></md-toast>');
      $mdToast.show(toast);
    };

    $scope.onHandsontableDataEdit = function(changes) {
      $scope.tableDataChanged = true;
    };

    $scope.open = function() {
      $scope.loading = true;
      table = sasAdapter.createTable([
        {libname: $scope.sideData.library, memname: $scope.sideData.table}
      ], 'data');

      sasAdapter.call('/Apps/tableEditor/getTable', table).then(function(res) {
        $scope.loading = false;
        $scope.htDynamicSpec = res.columnspec;
        $scope.htData = res.tabledata;

        $scope.tableDataChanged = false;
      }, function(err) {
        alert(err);
      });
    };

    $scope.save = function() {
      $scope.loading = true;
      table.add($scope.htData, 'tabledata');
      sasAdapter.call('/Apps/tableEditor/writeTable', table).then(function(res) {
        $scope.loading = false;
        $scope.htDynamicSpec = res.columnspec;
        $scope.htData = res.tabledata;

        $scope.tableDataChanged = false;
      }, function(err) {
        alert(err);
      });
    };
  }
]);
