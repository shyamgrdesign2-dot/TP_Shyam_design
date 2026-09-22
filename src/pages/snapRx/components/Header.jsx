import { notifyPrescriptionAction } from '../../../common/PrescriptionActionToast';
import RxWorkflowHeader, { rxClearAction } from '../../../common/prescription-header/RxWorkflowHeader';
import { headerIcon, visitActionIcon } from '../../../common/prescription-header/prescriptionHeaderActions';
import React, { useState, useCallback, useContext } from "react";
import { Container, Navbar, Row, Col } from "react-bootstrap";
import { Button, Tooltip } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

import CashManagerContext from "../../../context/CashManagerContext";
import ProfilePopover from "../../../common/ProfilePopover";
import CommonModal from "../../../common/CommonModal";

import "./Header.scss";
import { ASSETS } from "../../../assets";
const {
  alerticon: alertIcon,
  tutorial,
  video: videoSvg,
} = ASSETS.images;

function Header({
  onClear,
  onSubmit,
  smartRxData,
  loader,
  onUploadMore,
  showUploadMoreButton,
  handleTutorial,
  showTeleconsultIcon,
  onTeleconsultClick,
  isTeleconsultJoinLoading,
  isTeleconsultActive,
}) {
  const navigate = useNavigate();
  const { patient_data } = useContext(CashManagerContext);

  const [isBackModalOpen, setIsBackModalOpen] = useState(false);

  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  const showHideBackModal = useCallback(() => {
    setIsBackModalOpen(!isBackModalOpen);
  }, [isBackModalOpen]);

  const showHideClearModal = useCallback(() => {
    setIsClearModalOpen(!isClearModalOpen);
  }, [isClearModalOpen]);

  const checkDataFillOrNot = () => {
    if (smartRxData && smartRxData?.length) {
      showHideBackModal();
    } else {
      navigate("/", { replace: true });
    }
  };

  const handleClearClick = async () => {
    setIsClearModalOpen(!isClearModalOpen);
    await onClear();
    notifyPrescriptionAction('Prescription cleared');
  };

  const handleSubmitClick = async () => {
    onSubmit();
  };
  return <RxWorkflowHeader variant="snap-rx" patient={patient_data} onBack={checkDataFillOrNot} className="snap-rx-header" aria-label="SnapRx header" actions={{
    tutorial: { key: 'tutorial', ariaLabel: 'Play tutorial', icon: <img src={ASSETS.images.tutorial2} width={42} height={42} alt="" />, variant: 'ghost', style: { padding: 0, border: 0 }, onClick: handleTutorial },
    smart: [
      ...(showUploadMoreButton ? [{ key: 'upload', label: 'Upload more', icon: headerIcon('document-upload'), onClick: onUploadMore }] : []),
      ...(showTeleconsultIcon ? [{ key: 'teleconsult', ariaLabel: isTeleconsultActive ? 'Meeting in progress' : 'Tele-Consultation', icon: headerIcon('video'), onClick: onTeleconsultClick, disabled: isTeleconsultJoinLoading || isTeleconsultActive, loading: isTeleconsultJoinLoading }] : []),
    ],
    primary: { label: 'Visit', icon: visitActionIcon, onClick: handleSubmitClick, loading: loader, disabled: !showUploadMoreButton || loader },
    more: rxClearAction(() => setIsClearModalOpen(true), !smartRxData?.length || loader),
  }}>
    <CommonModal
                  isModalOpen={isBackModalOpen}
                  onCancel={showHideBackModal}
                  modalWidth={500}
                  title={"You may lose your data"}
                  modalBody={
                    <>
                      <div className="alert-warning rounded-10px p-2 patient-details">
                        <div className="d-flex align-items-center">
                          <img className="me-3" src={alertIcon} alt="Warning" />
                          <span>
                            Are you sure you want to leave? <br />
                            You will permanently lose your data.
                          </span>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="d-flex align-items-center mt-2 justify-content-end">
                          <div
                            onClick={() => navigate("/", { replace: true })}
                            className="me-4 text-decoration-underline btn p-0 text-main"
                          >
                            Yes Leave
                          </div>
                          <Button
                            onClick={showHideBackModal}
                            className="lh-lg btn btn-primary3 btn-41 px-4"
                          >
                            <span>No, Stay</span>
                          </Button>
                        </div>
                      </div>
                    </>
                  }
                />
    <CommonModal
                isModalOpen={isClearModalOpen}
                onCancel={showHideClearModal}
                modalWidth={500}
                title={"You may lose your data"}
                modalBody={
                  <>
                    <div className="alert-warning rounded-10px p-2 patient-details">
                      <div className="d-flex align-items-center">
                        <img className="me-3" src={alertIcon} alt="Warning" />
                        <span>
                          Are you sure you want to clear all the <br />
                          prescription pages data?
                        </span>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="d-flex align-items-center mt-2 justify-content-end">
                        <div
                          onClick={() => handleClearClick()}
                          className="me-4 text-decoration-underline btn p-0 text-main"
                        >
                          Clear
                        </div>
                        <Button
                          onClick={showHideClearModal}
                          className="lh-lg btn btn-primary3 btn-41 px-4"
                        >
                          <span>No</span>
                        </Button>
                      </div>
                    </div>
                  </>
                }
              />
  </RxWorkflowHeader>;
}
export default React.memo(Header);
