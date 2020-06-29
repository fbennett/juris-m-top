pageTitle: Beta Version
shortTitle: Beta
suppressTitle: true

``` yaml
type: embedProgramInfo

title: Jurism Installer (Beta Version)

description: The beta-version client installer in this page has passed
             automated tests, and is offered for testing in the wild.

             The beta client may contain undetected bugs, and may make
             changes to the database schema. To avoid
             touching your primary database, run the client from
             the command line with the ``--ProfileManager`` option,
             and in any case be sure to fully back up your data before
             installing this version of the client.
             
             To return to the stable version of the client, install
             via the **Current Release** page.
             
             This version includes comprehensive support for US
             legal citation rules. The test, select the style
             "JM Indigo Book (beta version)," and enter data as
             illustrated in the linked examples contained in the
             [Jurism-enhanced version of the IndigoBook](../indigobook/indigobook.html).
             
links:
    -
      label: Jurism Client Installer (Mac)
      icon: link.svg
      os: mac
      urlpath: https://our.law.nagoya-u.ac.jp/jurism/dl?channel=beta&platform=mac
      description: The installer for the Mac is currently unsigned. To run the application after
                   a first-time install, find Jurism in the Applications folder of the
                   Finder, right-click on its icon, and choose “Open.” Subsequent beta updates
                   will be automatic.
    -
      label: Jurism Client Installer (Windows)
      icon: link.svg
      os: win
      urlpath: https://our.law.nagoya-u.ac.jp/jurism/dl?channel=beta&platform=win32
      description: The installer for Windows is currently unsigned. On some systems
                   (depending on security software) you may need to take steps to permit
                   the application to run. Beta updates after the first install are
                   automatic.
    -
      label: Jurism Client Installer (Linux 64-bit)
      icon: link.svg
      os: lin64bit
      urlpath: https://our.law.nagoya-u.ac.jp/jurism/dl?channel=beta&platform=linux-x86_64
      description: The Linux installers (for 32-bit and 64-bit systems respectively) are
                   offered here as *zip* archives, not as package installers. To use, download
                   the archive, unzip it (``/opt`` is a common location), enter its directory,
                   and run the ``jurism`` application. Subsequent beta updates will be automatic.
    -
      label: Jurism Client Installer (Linux 32-bit)
      icon: link.svg
      os: lin32bit
      urlpath: https://our.law.nagoya-u.ac.jp/jurism/dl?channel=beta&platform=linux-i686
      description: The Linux installers (for 32-bit and 64-bit systems respectively) are
                   offered here as **zip** archives, not as package installers. To install, download
                   the archive, unzip it (``/opt`` is a common location), enter its directory,
                   and run the ``jurism`` application. Subsequent beta updates will be automatic.
    -
      label: Jurism Client (no installer available)
      icon: stop.svg
      os: none
      description: Installers for the Jurism client are available only for
                   Windows, Mac, and Linux operating systems.
    -
      label: Jurism Connector (Firefox)
      icon: link.svg
      browser: firefox
      urlpath: https://github.com/Juris-M/assets/releases/download/connector/firefox/plugin/release/Jurism_Connector-5.0.66.1.xpi
      description: Install this Jurism Connector to enable Jurism support in Google Docs
                   and one-click acquisition of database items from many websites.
    -
      label: Jurism Connector (Chrome)
      icon: link.svg
      browser: chrome
      urlpath: https://chrome.google.com/webstore/detail/juris-m-connector/pbhldkcipcaeniadfnhhdaealdfjgbpj
      description: Install this Jurism Connector to enable Jurism support in Google Docs
                   and one-click acquisition of database items from many websites.
    -
      label: Jurism Connector (no installer available)
      icon: stop.svg
      browser: none
      description: Jurism connectors are available only for
                   Chrome and Firefox browsers.

```
