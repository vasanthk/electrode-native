import {
  PackagePath,
  NativeApplicationDescriptor,
  utils as coreUtils,
  log,
} from 'ern-core'
import { getActiveCauldron } from 'ern-cauldron-api'
import utils from '../../../lib/utils'
import { Argv } from 'yargs'

export const command = 'jsapiimpls <jsapiimpls..>'
export const desc =
  'Remove one or more JS API implementation(s) from a given native application version in the Cauldron'

export const builder = (argv: Argv) => {
  return argv
    .option('containerVersion', {
      alias: 'v',
      describe:
        'Version to use for generated container. If none provided, version will be patched bumped by default.',
      type: 'string',
    })
    .option('descriptor', {
      alias: 'd',
      describe: 'A complete native application descriptor',
      type: 'string',
    })
    .epilog(utils.epilog(exports))
}

export const handler = async ({
  jsapiimpls,
  descriptor,
  containerVersion,
}: {
  jsapiimpls: string[]
  descriptor?: string
  containerVersion?: string
}) => {
  await utils.logErrorAndExitIfNotSatisfied({
    cauldronIsActive: {
      extraErrorMessage:
        'A Cauldron must be active in order to use this command',
    },
  })

  try {
    if (!descriptor) {
      descriptor = await utils.askUserToChooseANapDescriptorFromCauldron({
        onlyNonReleasedVersions: true,
      })
    }
    const napDescriptor = NativeApplicationDescriptor.fromString(descriptor)

    await utils.logErrorAndExitIfNotSatisfied({
      isCompleteNapDescriptorString: { descriptor },
      isNewerContainerVersion: containerVersion
        ? {
            containerVersion,
            descriptor,
            extraErrorMessage:
              'To avoid conflicts with previous versions, you can only use container version newer than the current one',
          }
        : undefined,
      isValidContainerVersion: containerVersion
        ? { containerVersion }
        : undefined,
      napDescriptorExistInCauldron: {
        descriptor,
        extraErrorMessage:
          'This command cannot work on a non existing native application version',
      },
    })

    const cauldronCommitMessage = [
      `${
        jsapiimpls.length === 1
          ? `Remove ${
              jsapiimpls[0]
            } JS API implementation from ${napDescriptor.toString()}`
          : `Remove multiple JS API implementations from ${napDescriptor.toString()}`
      }`,
    ]

    const cauldron = await getActiveCauldron()
    await utils.performContainerStateUpdateInCauldron(
      async () => {
        for (const jsApiImpl of jsapiimpls) {
          await cauldron.removeContainerJsApiImpl(
            napDescriptor,
            PackagePath.fromString(jsApiImpl)
          )
          cauldronCommitMessage.push(
            `- Remove ${jsApiImpl} JS API implementation`
          )
        }
      },
      napDescriptor,
      cauldronCommitMessage,
      { containerVersion }
    )
    log.debug(
      `JS API implementation(s) was/were succesfully removed fron ${napDescriptor.toString()} in the Cauldron`
    )
  } catch (e) {
    coreUtils.logErrorAndExitProcess(e)
  }
}
