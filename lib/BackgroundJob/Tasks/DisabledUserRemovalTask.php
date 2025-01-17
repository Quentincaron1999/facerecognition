<?php
/**
 * @copyright Copyright (c) 2019, Matias De lellis <mati86dl@gmail.com>
 *
 * @author Matias De lellis <mati86dl@gmail.com>
 *
 * @license GNU AGPL version 3 or any later version
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 */
namespace OCA\FaceRecognition\BackgroundJob\Tasks;

use OCP\IConfig;
use OCP\IUser;

use OCA\FaceRecognition\BackgroundJob\FaceRecognitionBackgroundTask;
use OCA\FaceRecognition\BackgroundJob\FaceRecognitionContext;
use OCA\FaceRecognition\Db\ImageMapper;
use OCA\FaceRecognition\Migration\AddDefaultFaceModel;

use OCA\FaceRecognition\FaceManagementService;

/**
 * Task that, for each user, check if disabled the analysis,
 * and if necessary remove data from this application
 */
class DisabledUserRemovalTask extends FaceRecognitionBackgroundTask {

	/** @var IConfig Config */
	private $config;

	/** @var ImageMapper Image mapper */
	private $imageMapper;

	/** @var FaceManagementService */
	protected $faceManagementService;

	/**
	 * @param IConfig $config Config
	 * @param ImageMapper $imageMapper Image mapper
	 * @param FaceManagementService $faceManagementService
	 */
	public function __construct (IConfig               $config,
		                     ImageMapper           $imageMapper,
		                     FaceManagementService $faceManagementService)
	{
		parent::__construct();
		$this->config                = $config;
		$this->imageMapper           = $imageMapper;
		$this->faceManagementService = $faceManagementService;
	}

	/**
	 * @inheritdoc
	 */
	public function description() {
		return "Purge all the information of a user when disable the analysis.";
	}

	/**
	 * @inheritdoc
	 */
	public function execute(FaceRecognitionContext $context) {
		$this->setContext($context);

		$model = intval($this->config->getAppValue('facerecognition', 'model', AddDefaultFaceModel::DEFAULT_FACE_MODEL_ID));

		// Check if we are called for one user only, or for all user in instance.
		$eligable_users = array();
		if (is_null($this->context->user)) {
			$this->context->userManager->callForSeenUsers(function (IUser $user) use (&$eligable_users) {
				$eligable_users[] = $user->getUID();
			});
		} else {
			$eligable_users[] = $this->context->user->getUID();
		}

		// Reset user datas if needed.
		foreach($eligable_users as $userId) {
			$userEnabled = $this->config->getUserValue($userId, 'facerecognition', 'enabled', 'false');
			$imageCount = $this->imageMapper->countUserImages($userId, $model);
			if ($userEnabled === 'false' && $imageCount > 0) {
				// TODO: Check that the user really has information to remove.
				$this->logInfo(sprintf('Removing data from user %s that disable analysis', $userId));
				$this->faceManagementService->resetAllForUser($userId);
			}
			yield;
		}

		return true;
	}

}
