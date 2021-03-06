#!/bin/bash
SCRIPT_PATH="./scripts/test.sh"


mainmenu () {
  echo "-> Insert number of test suite:"
  echo "1 - EthicHubLending"
  echo "2 - EthicHubReputation"
  echo "3 - EthicHubBase"
  echo "4 - EthicHubUser"
  echo "5 - EthicHubArbitrage"
  echo "6 - EthicHubIntegration"
  echo "7 - EthicHubDepositManager"
  echo "x - exit program"

  read  -n 1 -p "Input Selection:" mainmenuinput
  echo ""

  if [ "$mainmenuinput" = "1" ]; then
            bash $SCRIPT_PATH test/EthicHubLending.js
        elif [ "$mainmenuinput" = "2" ]; then
            bash $SCRIPT_PATH test/EthicHubReputation.js
        elif [ "$mainmenuinput" = "3" ]; then
            bash $SCRIPT_PATH test/EthicHubBase.js
        elif [ "$mainmenuinput" = "4" ]; then
            bash $SCRIPT_PATH test/EthicHubUser.js
        elif [ "$mainmenuinput" = "5" ]; then
              bash $SCRIPT_PATH test/EthicHubArbitrage.js
        elif [ "$mainmenuinput" = "6" ]; then
            bash $SCRIPT_PATH test/EthicHubIntegration.js
        elif [ "$mainmenuinput" = "7" ]; then
            bash $SCRIPT_PATH EthicHubDepositManager

        elif [ "$mainmenuinput" = "x" ];then
            exit 0
        else
            echo "You have entered an invallid selection!"
            echo "Please try again!"
            echo ""
            echo "Press any key to continue..."
            read -n 1
            clear
            mainmenu
        fi
}

mainmenu
