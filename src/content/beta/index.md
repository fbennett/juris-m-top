pageTitle: Beta Version
shortTitle: Beta
suppressTitle: true

``` yaml
type: embedProgramInfo

title: Jurism Installer (Beta Version)

description: The beta-version client installer in this page has passed
             automated tests, but contains code that has not yet been run
             in the wild. Before installing, be sure to back up your
             data, in particular your Jurism database file (jurism.sqlite)
             and storage directory.

             Take note of special instructions for the browser plugins,
             and be sure to replace beta versions of the Jurism client
             and connector when the proper release becomes available.

links:
    -
      label: Jurism Client Installer (Mac)
      icon: link.svg
      os: mac
      urlpath: https://jurism.xyz/jurism/dl?channel=beta&platform=mac
      description: The installer for the Mac is currently unsigned. To run the application after
                   a first-time install, find Jurism in the Applications folder of the
                   Finder, right-click on its icon, and choose “Open.” Subsequent beta updates
                   will be automatic.
    -
      label: Jurism Client Installer (Windows)
      icon: link.svg
      os: win
      urlpath: https://jurism.xyz/jurism/dl?channel=beta&platform=win32
      description: The installer for Windows is currently unsigned. On some systems
                   (depending on security software) you may need to take steps to permit
                   the application to run. Beta updates after the first install are
                   automatic.
    -
      label: Jurism Client Installer (Linux 64-bit)
      icon: link.svg
      os: lin64bit
      urlpath: https://jurism.xyz/jurism/dl?channel=beta&platform=linux-x86_64
      description: The Linux installers (for 32-bit and 64-bit systems respectively) are
                   offered here as *zip* archives, not as package installers. To use, download
                   the archive, unzip it (``/opt`` is a common location), enter its directory,
                   and run the ``jurism`` application. Subsequent beta updates will be automatic.
    -
      label: Jurism Client Installer (Linux 32-bit)
      icon: link.svg
      os: lin32bit
      urlpath: https://jurism.xyz/jurism/dl?channel=beta&platform=linux-i686
      description: The Linux installers (for 32-bit and 64-bit systems respectively) are
                   offered here as **zip** archives, not as package installers. To install, download
                   the archive, unzip it (``/opt`` is a common location), enter its directory,
                   and run the ``jurism`` application. Subsequent beta updates will be automatic.
    -
      label: Jurism Client (no installer available)
      icon: stop.svg
      os: none
      urlpath: https://www.youtube.com/watch?v=xvFZjo5PgG0
      description: Installers for the Jurism client are available only for
                   Windows, Mac, and Linux operating systems.
    -
      label: Jurism Connector (Firefox)
      icon: link.svg
      browser: firefox
      urlpath: ../jurism-firefix-connector-beta.zip
      description: To install this beta version of the Jurism connector for Firefox,
                   save this zip file to your computer (without unzipping it).
                   Open Firefox, and in the URL menu bar, type ``about:debugging``.
                   Click on **This Firefox**, then **Load Temporary Add-on**,
                   and select the zip file. (You will need to repeat the
                   temporary installation steps if you restart Firefox.)
    -
      label: Jurism Connector (Chrome)
      icon: link.svg
      browser: chrome
      urlpath: ../jurism-chrome-connector-beta.zip
      description: This is the unpacked code for the Chrome connector.
                   To run it, unzip the contents, open Settings→Extensions,
                   turn on "Developer mode", click on "Load unpacked,"
                   navigate into the ``jurism-chrome-connector-beta`` 
                   directory, and select it.
    -
      label: Jurism Connector (no installer available)
      icon: stop.svg
      browser: none
      urlpath: https://www.youtube.com/watch?v=xvFZjo5PgG0
      description: Jurism connectors are available only for
                   Chrome and Firefox browsers.

```
