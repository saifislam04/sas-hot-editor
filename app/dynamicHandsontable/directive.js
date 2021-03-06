angular.module('dynamicHandsontable', ['ngHandsontable'])

.directive('htDynamic', [
  'hotRegisterer',
  '$timeout',
  '$window',
  function(hotRegisterer, $timeout, $window) {
    return {
      restrict: 'E',
      scope: {
        spec: '=',
        data: '=',
        errorHandler: '=',
        onDataChange: '=',
        onSettingsChange: '=',
        hotId: '@',
        width: '@',
        height: '@'
      },
      templateUrl: 'dynamicHandsontable/template.html',
      controller: [
        '$scope',
        '$element',
        function($scope, $element) {
          $scope.hotId = 'table-' + Math.random().toString(16).slice(2);

          var getType = function(typeInt) {
            switch(typeInt) {
              case 2:
                return 'text';
              case 1:
                return 'numeric';
            }
          };

          angular.element($window).bind('resize', function() {
            var tableWidth = 0;
            if(!$scope.spec) {
              return;
            }

            setTimeout(function() {
              if($scope.width) {
                tableWidth = $scope.width;
              } else {
                var maxWidth = $element.parent().parent()[0].clientWidth - 32; //32px for margin
                $scope.spec.forEach(function(s) {
                  tableWidth += parseInt(s.LENGTH) * 15;
                });
                tableWidth = Math.min(tableWidth, maxWidth);
              }
              updateTableSettings({width: tableWidth});
            }, 500);
          });

          $scope.$watchCollection('spec', function() {
            if($scope.spec && $scope.data) {
              var tableWidth = 0;

              $scope.columns = $scope.spec.map(function(s) {
                return {
                  // type: getType(s.TYPE),
                  data: s.NAME.toUpperCase(),
                  title: s.NAME
                };
              });

              if(!$scope.width) {
                var maxWidth = $element.parent().parent()[0].clientWidth - 32; //32px for margin
                $scope.spec.forEach(function(s) {
                  tableWidth += parseInt(s.LENGTH) * 15;
                });
                tableWidth = Math.min(tableWidth, maxWidth);
              }

              updateTableSettings({width: $scope.width || tableWidth});

              $scope.settings = {
                autoWrapRow: true,
                stretchH: 'all',
                width: $scope.width || tableWidth,
                beforeChange: function (changes) {
                  if(changes.length === 0) return;

                  var instance = hotRegisterer.getInstance($scope.hotId);

                  for(var i = 0; i < $scope.spec.length; i++) {
                    for(var j = 0; j < changes.length; j++) {
                      if(changes[j][1] === $scope.spec[i].NAME.toUpperCase()) {
                        var colIndex = $scope.columns.map(function(o) {
                          return o.data;
                        }).indexOf(changes[j][1]);

                        if(getType($scope.spec[i].TYPE) !== 'numeric') {
                          if(changes[j][3] && changes[j][3].length > $scope.spec[i].LENGTH) {
                            if($scope.spec[i].LENGTH.toString().slice(-1) === '1') {
                              $scope.errorHandler('Max length of ' + $scope.spec[i].LENGTH + ' character exceeded');
                            } else {
                              $scope.errorHandler('Max length of ' + $scope.spec[i].LENGTH + ' characters exceeded');
                            }
                            instance.setCellMeta(changes[j][0], colIndex, 'valid', false);
                          } else {
                            instance.setCellMeta(changes[j][0], colIndex, 'valid', true);
                          }
                        } else {
                          if(isNaN(changes[j][3])) {
                            $scope.errorHandler('Only numeric values are accepted');
                            instance.setCellMeta(changes[j][0], colIndex, 'valid', false);
                          } else {
                            instance.setCellMeta(changes[j][0], colIndex, 'valid', true);
                            changes[j][3] = changes[j][3] && parseFloat(changes[j][3]);
                          }

                          if(changes[j][3] === '') {
                            changes[j][3] = null;
                          }
                        }
                      }
                    }
                  }
                },
                beforeRender: function(isForced) {
                  if(!isForced) return;
                  var instance = hotRegisterer.getInstance($scope.hotId);
                  if(instance) {
                    for(var i = 0; i < $scope.spec.length; i++) {
                      var specKey = $scope.spec[i].NAME.toUpperCase();
                      for(var j = 0; j < $scope.data.length; j++) {
                        if(getType($scope.spec[i].TYPE) !== 'numeric') {
                          if($scope.data[j][specKey] && $scope.spec[i].LENGTH < $scope.data[j][specKey].length) {
                            isInvalid = true;
                            instance.setCellMeta(j, i, 'valid', false);
                          } else {
                            instance.setCellMeta(j, i, 'valid', true);
                          }
                        } else {
                          if($scope.data[j][specKey] && isNaN($scope.data[j][specKey])) {
                            isInvalid = true;
                            instance.setCellMeta(j, i, 'valid', false);
                          } else {
                            instance.setCellMeta(j, i, 'valid', true);
                          }
                        }
                      }
                    }
                  }
                },
                afterLoadData: function() {
                  $timeout(function() {
                    var instance = hotRegisterer.getInstance($scope.hotId);
                    if(instance && !instance.isEmptyRow(instance.countRows() - 1)) {
                      insertEmptyRow();
                    }
                  }, 100);
                },
                afterChange: function(changes, source) {
                  if(!changes) return;

                  var instance = hotRegisterer.getInstance($scope.hotId);
                  var rowInd;
                  for(var i = changes.length - 1; i >= 0; i--) {
                    //skip this change if we had another from the same row
                    if(rowInd === changes[i][0]) {
                      continue;
                    }
                    rowInd = changes[i][0];
                    //if it's last row and it's empty
                    if(rowInd === instance.countRows() - 1 && !instance.isEmptyRow(instance.countRows() - 1)) {
                      insertEmptyRow();
                      break;
                    } else if(rowInd !== instance.countRows() - 1 && instance.isEmptyRow(changes[i][0])) {
                      instance.alter('remove_row', rowInd);
                    }
                  }
                  rowInd = null;

                  $scope.onDataChange(changes, instance);
                }
              };
            } else {
              $scope.columns = null;
            }
          });

          function insertEmptyRow() {
            var instance = hotRegisterer.getInstance($scope.hotId);
            instance.alter('insert_row');
          }

          function updateTableSettings(settings) {
            var instance = hotRegisterer.getInstance($scope.hotId);
            if(instance) {
              setTimeout(function() {
                instance.updateSettings(settings);
                $scope.onSettingsChange(null, instance);
              }, 0);
            }
          }
        }
      ]
    };
  }
]);
