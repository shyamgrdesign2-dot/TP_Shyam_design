import { Input, Drawer } from "antd";
import { ASSETS } from "../../../../assets";
import { Button } from "react-bootstrap";
import { useState } from "react";
import { upsertBillItem } from "../../service";
import { useSelector } from "react-redux";
import { calculateTotalAmount } from "../../utils/helper";
import {
  getClinic,
  onlyDecimalFormat,
  trackEvent,
} from "../../../../utils/utils";

const ServiceItemPopup = ({
  onCancel,
  editIndex,
  item,
  setDataSource,
  addRow,
  setSearchQuery,
}) => {
  const { advancedSettings } = useSelector((state) => state.billing);
  const [serviceItem, setServiceItem] = useState({
    id: item?.id || item?.masterId,
    name: item?.name,
    type: item?.type || "Service",
    price: item?.price || item?.amount,
    discount: item?.discount,
    discountType: item?.discountType || advancedSettings?.defaultDiscountType || "flat",
    gst: item?.gst,
  });
  const { profile } = useSelector((state) => state.doctors);
  const { planDetails } = useSelector((state) => state.subscription);
  const {
    close: closeIcon
  } = ASSETS.images;

  const handleServiceItem = (key, value) => {
    setServiceItem((prev) => {
      return {
        ...prev,
        [key]: value,
        ...(key === "discountType" && { discount: undefined }),
      };
    });
  };

  const addOrEditServieItem = async () => {
    if (editIndex === -1) {
      const clinic = getClinic();
      trackEvent("TP_Billing_Addnewseriviceadd", {
        doctorSpeciality: profile?.dp_name,
        doctorId: profile?.doctor_unique_id,
        doctorContact: profile?.um_contact,
        city: clinic?.hm_city,
        pincode: clinic?.hm_pincode,
        subscriptionStatus: planDetails?.currentPlanStatus,
        type: serviceItem?.type
      });
    }

    const finalItem = { ...serviceItem };
    finalItem.totalAmount = calculateTotalAmount(finalItem);
    handleServiceItem(finalItem);

    const billItemRes = await upsertBillItem({
      ...finalItem,
      discount: finalItem?.discount || undefined,
      gst: finalItem?.gst || undefined,
    });

    if (billItemRes?.id) {
      setDataSource((prev) => {
        const updatedData = [...prev];
        const updateIndex = editIndex > -1 ? editIndex : item?.index;

        if (updateIndex > -1 && updatedData[updateIndex]) {
          updatedData[updateIndex] = {
            ...billItemRes,
            ...updatedData[updateIndex], // Keep existing values
            masterId: billItemRes?.id,
            quantity: 1,
            name: finalItem?.name,
            amount: finalItem?.price,
            discount: finalItem?.discount,
            discountType: finalItem?.discountType,
            type: finalItem?.type,
            gst: finalItem?.gst,
            totalAmount: finalItem?.totalAmount,
            createdBy: billItemRes?.createdBy,
          };
          addRow &&
            updateIndex === prev?.length - 1 &&
            updatedData.push({
              masterId: "",
              name: "",
              quantity: "",
              amount: "",
              discount: "",
              discountType: "",
              gst: "",
              totalAmount: "",
              createdBy: "",
            });
        } else {
          // If no valid index, add a new item
          updatedData.push({
            masterId: billItemRes?.id,
            quantity: 1,
            name: finalItem?.name,
            amount: finalItem?.price,
            discount: finalItem?.discount,
            discountType: finalItem?.discountType,
            type: finalItem?.type,
            gst: finalItem?.gst,
            totalAmount: finalItem?.totalAmount,
            createdBy: billItemRes?.createdBy,
            ...billItemRes,
          });
        }
        return updatedData;
      });
      setSearchQuery && setSearchQuery("");
      onCancel();
    }
  };

  // Preview amount
  const previewItem = {
    ...serviceItem,
  };
  const totalAmount = calculateTotalAmount(previewItem);

  return (
    <Drawer
      title={
        <div className="d-flex align-items-center gap-2">
          <span style={{ fontWeight: 600, fontSize: '16px', color: '#1A1A1A' }}>
            {editIndex === -1 ? "Add new bill item" : "Edit bill item"}
          </span>
          <i className="fi fi-rr-info text-muted" style={{ fontSize: '14px', cursor: 'pointer' }}></i>
        </div>
      }
      placement="right"
      onClose={onCancel}
      open={true}
      width={500}
      closeIcon={<img src={closeIcon} alt="close" style={{ width: '24px', height: '24px', cursor: 'pointer'}} />}
      extra={
        <Button
          onClick={addOrEditServieItem}
          className="btn btn-primary3 px-4"
          style={{ height: '36px', borderRadius: '6px', background: '#5452F6', border: 'none' }}
          disabled={!serviceItem.type || !serviceItem.name || !serviceItem.price}
        >
          <span>Save</span>
        </Button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px', overflowX: 'hidden' }}>
        <div className="d-flex flex-column gap-4" style={{ flex: 1 }}>

          {/* Type selection */}
          <div className="d-flex flex-column gap-2">
            <label className="d-flex align-items-center gap-2 text-muted mb-0" style={{ fontSize: '13px', fontWeight: 500 }}>
              Type <i className="fi fi-rr-info" style={{ fontSize: '12px' }}></i>
            </label>
            <div style={{ background: '#F2F4F7', borderRadius: '8px', padding: '4px', display: 'flex' }}>
              {[{label: 'Clinical services', value: 'Service'}, {label: 'Consumables', value: 'Consumables'}, {label: 'Dental services', value: 'Dental_Service'}].map((typeOption) => (
                <div
                  key={typeOption.value}
                  onClick={() => handleServiceItem("type", typeOption.value)}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '8px 4px',
                    fontSize: '13px',
                    fontWeight: serviceItem.type === typeOption.value ? 600 : 500,
                    color: serviceItem.type === typeOption.value ? '#1A1A1A' : '#667085',
                    background: serviceItem.type === typeOption.value ? '#FFFFFF' : 'transparent',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    boxShadow: serviceItem.type === typeOption.value ? '0px 1px 3px rgba(16, 24, 40, 0.1), 0px 1px 2px rgba(16, 24, 40, 0.06)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  {typeOption.label}
                </div>
              ))}
            </div>
          </div>

          {/* Clinical service name */}
          <div className="d-flex flex-column gap-2">
            <label className="text-muted mb-0" style={{ fontSize: '13px', fontWeight: 500, color: '#475467' }}>
              {serviceItem.type === 'Service' ? 'Clinical service name' : serviceItem.type === 'Consumables' ? 'Consumable name' : 'Dental service name'} <span className="text-danger">*</span>
            </label>
            <Input
              value={serviceItem.name}
              placeholder="Search or type a name"
              style={{ height: 44, borderRadius: '8px' }}
              onChange={(e) => handleServiceItem("name", e.target.value)}
            />
          </div>

          {/* Price */}
          <div className="d-flex flex-column gap-2">
            <label className="text-muted mb-0" style={{ fontSize: '13px', fontWeight: 500, color: '#475467' }}>
              Price (₹) <span className="text-danger">*</span>
            </label>
            <Input
              value={serviceItem.price}
              placeholder="0"
              inputMode="decimal"
              onChange={(e) => {
                const price = onlyDecimalFormat(e.target.value);
                if (price <= 1000000000) {
                  handleServiceItem("price", price);
                }
              }}
              style={{ height: 44, borderRadius: '8px' }}
              prefix={<span style={{ color: '#475467', marginRight: '4px' }}>₹</span>}
            />
          </div>

          {/* Taxes & Discount */}
          <div className="d-flex gap-3">
            <div className="d-flex flex-column gap-2" style={{ flex: 1 }}>
              <label className="text-muted mb-0" style={{ fontSize: '13px', fontWeight: 500, color: '#475467' }}>
                GST (%)
              </label>
              <Input
                value={serviceItem.gst}
                placeholder="0"
                inputMode="decimal"
                onChange={(e) => {
                  const value = onlyDecimalFormat(e.target.value);
                  handleServiceItem("gst", value > 100 ? serviceItem.gst : value ? value : undefined);
                }}
                style={{ height: 44, borderRadius: '8px' }}
                suffix={<span style={{ color: '#475467' }}>%</span>}
              />
            </div>
            <div className="d-flex flex-column gap-2" style={{ flex: 1 }}>
              <label className="text-muted mb-0" style={{ fontSize: '13px', fontWeight: 500, color: '#475467' }}>
                Discount
              </label>
              <div style={{ position: 'relative' }}>
                <Input
                  value={serviceItem.discount}
                  placeholder="0"
                  inputMode="decimal"
                  onChange={(e) => {
                    const discount = onlyDecimalFormat(e.target.value);
                    if (
                      (serviceItem.discountType === "percentage" && discount <= 100) ||
                      (serviceItem.discountType === "flat" && Number(discount) <= Number(serviceItem.price))
                    ) {
                      handleServiceItem("discount", discount ? discount : undefined);
                    }
                  }}
                  style={{ height: 44, borderRadius: '8px', paddingRight: '56px' }}
                />
                <div
                  style={{
                    position: 'absolute',
                    right: '4px',
                    top: '4px',
                    bottom: '4px',
                    background: '#F2F4F7',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '2px'
                  }}
                >
                  <div
                    onClick={() => handleServiceItem("discountType", "flat")}
                    style={{
                      padding: '2px 8px',
                      cursor: 'pointer',
                      background: serviceItem.discountType === 'flat' ? '#FFFFFF' : 'transparent',
                      borderRadius: '2px',
                      boxShadow: serviceItem.discountType === 'flat' ? '0px 1px 2px rgba(16, 24, 40, 0.05)' : 'none',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: serviceItem.discountType === 'flat' ? '#1A1A1A' : '#667085'
                    }}
                  >
                    ₹
                  </div>
                  <div
                    onClick={() => handleServiceItem("discountType", "percentage")}
                    style={{
                      padding: '2px 8px',
                      cursor: 'pointer',
                      background: serviceItem.discountType === 'percentage' ? '#FFFFFF' : 'transparent',
                      borderRadius: '2px',
                      boxShadow: serviceItem.discountType === 'percentage' ? '0px 1px 2px rgba(16, 24, 40, 0.05)' : 'none',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: serviceItem.discountType === 'percentage' ? '#1A1A1A' : '#667085'
                    }}
                  >
                    %
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto" style={{ borderTop: '1px solid #EAECF0', paddingTop: '20px', marginTop: '40px' }}>
          <div className="d-flex justify-content-between align-items-center">
            <span style={{ fontWeight: 600, color: '#475467', fontSize: '14px' }}>Total amount (incl. GST)</span>
            <span style={{ fontWeight: 600, color: '#1A1A1A', fontSize: '16px' }}>
              {totalAmount > 0 ? `₹ ${totalAmount}` : '-'}
            </span>
          </div>
        </div>
      </div>
    </Drawer>
  );
};

export default ServiceItemPopup;
